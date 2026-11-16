package id.motomate.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.Priority;

import org.json.JSONObject;

/**
 * RideForegroundService — Foreground Service tipe `location`.
 *
 * Kebutuhan utama (layar terkunci):
 *  - Perjalanan TETAP direkam saat layar mati / aplikasi tidak terlihat,
 *    karena akses lokasi dilanjutkan lewat foreground service + notifikasi
 *    persisten (Android 10+ membolehkan lokasi berlanjut selama service
 *    foreground dengan tipe location berjalan dan dimulai saat app di depan).
 *  - Data koordinat & progres jarak tersimpan lokal (TripDb) sepanjang sesi.
 *  - Ketika aplikasi dibuka kembali, status sesi dibaca dari TripDb lewat
 *    plugin getStatus() — UI menampilkan status yang benar.
 *
 * Ketahanan:
 *  - START_STICKY: sistem mencoba menjalankan ulang service bila dimatikan;
 *    saat restart, sesi aktif DILANJUTKAN dari TripDb (bukan mulai dari nol).
 *  - Jangan pernah menghidupkan ulang rekaman jika sesi sudah selesai.
 *  - Sesi lama yang tersisa (proses mati mendadak) diselamatkan sebagai trip
 *    pending oleh TripDb.startSession() — tidak ada data hilang diam-diam.
 *
 * Catatan OEM (jujur): sebagian merek HP (Xiaomi/Oppo/Vivo dkk.) dengan
 * penghemat baterai agresif dapat mematikan service — pengguna dapat
 * mengecualikan MotoMate dari "battery optimization" untuk hasil terbaik.
 */
public class RideForegroundService extends Service {

    public static final String ACTION_START = "id.motomate.app.ride.START";
    public static final String ACTION_FINISH = "id.motomate.app.ride.FINISH";
    public static final String ACTION_DISCARD = "id.motomate.app.ride.DISCARD";

    private static final String CHANNEL_ID = "ride_tracking";
    private static final int NOTIF_ID = 42;

    /** Interval sampling GPS (ms) — cukup rapat untuk jalanan kota. */
    private static final long INTERVAL_MS = 3000;
    /** Jarak minimum antar fix yang dianggap bergerak (m). */
    private static final float MIN_DISPLACEMENT_M = 4f;

    // Filter kualitas GPS — logika setara versi web (ride-view/page.tsx)
    private static final float ACC_ACCURATE = 100f;   // ≤100 m: presisi penuh
    private static final float ACC_COARSE_MAX = 300f; // ≤300 m: kasar, tetap dihitung adaptif
    private static final long GAP_REANCHOR_SEC = 600; // >10 menit tanpa fix → pindah jangkar
    private static final double MAX_STEP_KMH = 150;   // >150 km/j dianggap teleport
    private static final long MOVING_CAP_MS = 120_000; // jeda maks 2 menit dihitung "bergerak"

    private FusedLocationProviderClient fusedClient;
    private LocationCallback locationCallback;

    // Jangkar langkah terakhir
    private Double anchorLat = null;
    private Double anchorLng = null;
    private long anchorTs = 0;

    // Progres sesi
    private String clientRef = "";
    private String vehicleId = "";
    private String userId = "";
    private String source = "manual";
    private long startedAt = 0;
    private double distanceKm = 0;
    private long movingMs = 0;
    private int fixes = 0;
    private boolean recording = false;
    private boolean finishing = false;

    private HandlerThread syncThread;
    private Handler syncHandler;
    private Handler mainHandler;

    /** Status live untuk plugin getStatus() tanpa mengikat instance. */
    private static volatile boolean sRecording = false;
    private static volatile long sStartedAt = 0;
    private static volatile double sDistanceKm = 0;
    private static volatile long sMovingMs = 0;
    private static volatile int sFixes = 0;

    /** Callback network — sinkron ulang antrean saat internet kembali. */
    private android.net.ConnectivityManager.NetworkCallback networkCallback;

    public static boolean isRecording() {
        return sRecording;
    }

    public static JSONObject statusSnapshot() {
        try {
            JSONObject o = new JSONObject();
            o.put("active", sRecording);
            o.put("startedAt", sStartedAt);
            o.put("distanceKm", sDistanceKm);
            o.put("movingSec", (int) (sMovingMs / 1000));
            o.put("fixes", sFixes);
            return o;
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        mainHandler = new Handler(Looper.getMainLooper());
        fusedClient = LocationServices.getFusedLocationProviderClient(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;
        // freshStart = dipanggil dari plugin untuk sesi BARU (bukan pulihan
        // sistem). Intent null dari START_STICKY berarti pulihan sistem.
        boolean freshStart = intent != null && intent.getBooleanExtra("freshStart", false);

        if (ACTION_DISCARD.equals(action)) {
            discardAndStop();
            return START_NOT_STICKY;
        }
        if (ACTION_FINISH.equals(action)) {
            finishAndStop();
            return START_NOT_STICKY;
        }

        // Mulai / lanjut sesi
        startAsForeground();

        JSONObject session = TripDb.get(this).getSession();
        if (!freshStart && session != null
            && TripDb.STATE_RECORDING.equals(session.optString("state"))) {
            // Pulihan: proses pernah dimatikan — lanjutkan sesi, jangan mulai baru
            restoreSession(session);
        } else if (!recording) {
            clientRef = intent.getStringExtra("clientRef");
            vehicleId = intent.getStringExtra("vehicleId");
            userId = intent.getStringExtra("userId");
            source = intent.getStringExtra("source") != null ? intent.getStringExtra("source") : "manual";
            startedAt = intent.getLongExtra("startedAt", System.currentTimeMillis());
            distanceKm = 0;
            movingMs = 0;
            fixes = 0;
            anchorLat = null;
            anchorLng = null;
            anchorTs = 0;
            TripDb.get(this).startSession(clientRef, vehicleId, userId, source, startedAt);
        }

        recording = true;
        finishing = false;
        publishStatus();

        registerNetworkCallback();
        requestLocationUpdates();

        // Antrean lama dari sesi offline sebelumnya — kirim di latar belakang
        runOnSyncThread(() -> TripSyncer.flushAll(this));

        return START_STICKY;
    }

    private void startAsForeground() {
        createChannel();
        Notification notif = buildNotification(distanceKm, startedAt);
        if (Build.VERSION.SDK_INT >= 29) {
            ServiceCompat_startForeground(notif);
        } else {
            startForeground(NOTIF_ID, notif);
        }
    }

    private void ServiceCompat_startForeground(Notification notif) {
        androidx.core.app.ServiceCompat.startForeground(
            this, NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
    }

    private void restoreSession(JSONObject session) {
        try {
            clientRef = session.optString("clientRef");
            vehicleId = session.optString("vehicleId");
            userId = session.optString("userId");
            source = session.optString("source", "manual");
            startedAt = session.optLong("startedAt", System.currentTimeMillis());
            distanceKm = session.optDouble("distance", 0);
            movingMs = session.optLong("movingMs", 0);
            fixes = session.optInt("fixes", 0);
            anchorLat = session.has("lastLat") ? session.getDouble("lastLat") : null;
            anchorLng = session.has("lastLng") ? session.getDouble("lastLng") : null;
            anchorTs = session.optLong("lastTs", 0);
        } catch (Exception ignored) {
        }
    }

    // ---------- GPS ----------

    private void requestLocationUpdates() {
        if (locationCallback != null) return;
        LocationRequest request;
        if (Build.VERSION.SDK_INT >= 31) {
            request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
                .setMinUpdateDistanceMeters(MIN_DISPLACEMENT_M)
                .setMaxUpdateDelayMillis(INTERVAL_MS * 4)
                .build();
        } else {
            request = LocationRequest.create()
                .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY)
                .setInterval(INTERVAL_MS)
                .setFastestInterval(2000)
                .setSmallestDisplacement(MIN_DISPLACEMENT_M);
        }
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (!recording || finishing) return;
                for (Location loc : result.getLocations()) {
                    handleFix(loc);
                }
            }
        };
        fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
    }

    private void stopLocationUpdates() {
        if (locationCallback != null) {
            try {
                fusedClient.removeLocationUpdates(locationCallback);
            } catch (Exception ignored) {
            }
            locationCallback = null;
        }
    }

    /** Filter & akumulasi satu fix GPS — aturan sama dengan versi web. */
    private void handleFix(Location loc) {
        final double lat = loc.getLatitude();
        final double lng = loc.getLongitude();
        final float acc = loc.hasAccuracy() ? loc.getAccuracy() : 50f;
        final long ts = loc.getTime() > 0 ? loc.getTime() : System.currentTimeMillis();

        boolean addPoint = false;

        if (anchorLat == null) {
            // Fix pertama = titik awal rute
            anchorLat = lat;
            anchorLng = lng;
            anchorTs = ts;
            fixes += 1;
            addPoint = true;
            persistProgress(addPoint, lat, lng, ts);
            publishStatus();
            return;
        }

        if (acc > ACC_COARSE_MAX) {
            return; // terlalu kasar — hanya untuk peta, tidak dihitung
        }

        final long dtSec = Math.max(0, (ts - anchorTs) / 1000);

        if (dtSec > GAP_REANCHOR_SEC) {
            // Jeda sinyal sangat panjang: pindah jangkar tanpa menghitung km jeda
            anchorLat = lat;
            anchorLng = lng;
            anchorTs = ts;
            fixes += 1;
            addPoint = true;
            persistProgress(addPoint, lat, lng, ts);
            publishStatus();
            return;
        }

        final double stepKm = haversineKm(anchorLat, anchorLng, lat, lng);
        // Lompatan mustahil → teleport, abaikan
        if (dtSec > 0 && (stepKm / dtSec) * 3600 > MAX_STEP_KMH) {
            return;
        }

        // Langkah minimum adaptif: makin kasar akurasi, makin besar gerakan nyata
        final double minStepKm = Math.max(0.005, (acc * 0.75) / 1000.0);
        if (stepKm >= minStepKm) {
            anchorLat = lat;
            anchorLng = lng;
            anchorTs = ts;
            distanceKm += stepKm;
            movingMs += Math.min(dtSec * 1000, MOVING_CAP_MS);
            fixes += 1;
            addPoint = true;
            persistProgress(addPoint, lat, lng, ts);
            publishStatus();
            return;
        }

        // Gerakan kecil di bawah ambang — jangan buang titik valid untuk rute
        persistProgress(false, lat, lng, ts);
    }

    /** Simpan progres + titik rute ke SQLite (offline-first). */
    private boolean notifTickScheduled = false;

    private void persistProgress(boolean addPoint, double lat, double lng, long ts) {
        sDistanceKm = distanceKm;
        sMovingMs = movingMs;
        sFixes = fixes;
        final boolean point = addPoint;
        runOnSyncThread(() ->
            TripDb.get(RideForegroundService.this)
                .updateSession(distanceKm, movingMs, fixes, lat, lng, ts, point));
        // Notifikasi diperbarui tiap ±30 detik (kronometer durasi berjalan
        // sendiri; teks jarak ikut diperbarui). Satu antrean saja — tidak
        // menumpuk meski fix GPS datang rapat.
        if (!notifTickScheduled) {
            notifTickScheduled = true;
            mainHandler.postDelayed(() -> {
                notifTickScheduled = false;
                if (recording) {
                    updateNotification();
                }
            }, 30_000);
        }
    }

    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0;
        final double dLat = Math.toRadians(lat2 - lat1);
        final double dLng = Math.toRadians(lng2 - lng1);
        final double a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    // ---------- Selesai / buang ----------

    private void finishAndStop() {
        if (finishing) return;
        finishing = true;
        recording = false;
        sRecording = false;
        stopLocationUpdates();
        unregisterNetworkCallback();

        TripDb db = TripDb.get(this);
        db.markFinished();
        final String path = db.getPointsJson();
        final double distance = Math.round(distanceKm * 100.0) / 100.0;
        final long endedAt = System.currentTimeMillis();
        final int duration = (int) Math.max(1, (endedAt - startedAt) / 1000);
        final int movingSec = (int) Math.max(1, movingMs / 1000);

        final boolean hasFix = fixes > 0 && distance >= 0.01;
        if (hasFix) {
            db.enqueuePendingTrip(clientRef, vehicleId, distance, duration, movingSec, source, path, startedAt, endedAt);
        }

        runOnSyncThread(() -> {
            int pending = hasFix ? TripSyncer.flushAll(RideForegroundService.this) : 0;
            boolean synced = hasFix && pending == 0;
            mainHandler.post(() -> {
                RideTrackingPlugin.notifyFinished(
                    RideForegroundService.this,
                    hasFix,
                    synced,
                    distance,
                    duration,
                    movingSec,
                    clientRef);
                cleanupAndStop();
            });
        });
    }

    private void discardAndStop() {
        recording = false;
        sRecording = false;
        finishing = true;
        stopLocationUpdates();
        unregisterNetworkCallback();
        TripDb.get(this).clearSession();
        runOnSyncThread(() -> {
            TripSyncer.flushAll(RideForegroundService.this);
            mainHandler.post(this::cleanupAndStop);
        });
    }

    private void cleanupAndStop() {
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // App diseka dari recents — progres sudah aman di SQLite; biarkan
        // START_STICKY yang mencoba menghidupkan ulang service.
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        stopLocationUpdates();
        unregisterNetworkCallback();
        if (syncThread != null) {
            syncThread.quitSafely();
            syncThread = null;
        }
        sRecording = false;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ---------- Sinkronisasi antrean saat internet kembali ----------

    private void registerNetworkCallback() {
        if (networkCallback != null) return;
        try {
            android.net.ConnectivityManager cm =
                (android.net.ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            android.net.NetworkRequest req = new android.net.NetworkRequest.Builder()
                .addCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
            networkCallback = new android.net.ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(android.net.Network network) {
                    runOnSyncThread(() -> TripSyncer.flushAll(RideForegroundService.this));
                }
            };
            cm.registerNetworkCallback(req, networkCallback);
        } catch (Exception ignored) {
        }
    }

    private void unregisterNetworkCallback() {
        if (networkCallback != null) {
            try {
                android.net.ConnectivityManager cm =
                    (android.net.ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                cm.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {
            }
            networkCallback = null;
        }
    }

    // ---------- Util ----------

    private void runOnSyncThread(Runnable r) {
        if (syncThread == null) {
            syncThread = new HandlerThread("RideSync");
            syncThread.start();
            syncHandler = new Handler(syncThread.getLooper());
        }
        syncHandler.post(r);
    }

    private void publishStatus() {
        sRecording = recording;
        sStartedAt = startedAt;
        sDistanceKm = distanceKm;
        sMovingMs = movingMs;
        sFixes = fixes;
        RideTrackingPlugin.notifyUpdate(this, distanceKm, (System.currentTimeMillis() - startedAt) / 1000, movingMs / 1000, fixes);
    }

    // ---------- Notifikasi ----------

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID,
                "Perekaman Perjalanan",
                NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Notifikasi selama perjalanan direkam dengan GPS");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification(double km, long startedTs) {
        String kmText = km >= 10 ? String.format(java.util.Locale.US, "%.1f", km)
            : String.format(java.util.Locale.US, "%.2f", km);
        Intent openApp = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pOpen = null;
        if (openApp != null) {
            pOpen = PendingIntent.getActivity(
                this, 0, openApp,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        }
        Intent stopIntent = new Intent(this, RideForegroundService.class);
        stopIntent.setAction(ACTION_FINISH);
        PendingIntent pStop = PendingIntent.getService(
            this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_moto)
            .setContentTitle("MotoMate merekam perjalanan")
            .setContentText(kmText + " km tercatat — ketuk Selesai untuk menghentikan")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setUsesChronometer(true)
            .setWhen(startedTs)
            .setContentIntent(pOpen)
            .addAction(0, "Selesai", pStop);
        if (pOpen == null) {
            b.setContentIntent(null);
        }
        return b.build();
    }

    private void updateNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify(NOTIF_ID, buildNotification(distanceKm, startedAt));
    }
}
