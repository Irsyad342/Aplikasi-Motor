package id.motomate.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.LocationManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.util.UUID;

/**
 * RideTrackingPlugin — jembatan WebView ↔ Foreground Service.
 *
 * Dipakai UI web MotoMate lewat window.Capacitor.Plugins.RideTracking.
 * Alur Mulai:
 *   1. start() memeriksa izin lokasi (dialog Android bila belum ada)
 *   2. memeriksa GPS perangkat aktif
 *   3. menjalankan RideForegroundService (sesi baru, anti ganda)
 *   4. UI menerima event onTripUpdate selama merekam
 * Alur Selesai:
 *   finish() → service menyimpan + sinkron + berhenti → event onTripFinished
 */
@CapacitorPlugin(name = "RideTracking", permissions = {
    @Permission(strings = {Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, alias = "location"),
    @Permission(strings = {Manifest.permission.POST_NOTIFICATIONS}, alias = "notifications")
})
public class RideTrackingPlugin extends Plugin {

    private static final String LOCATION_ALIAS = "location";
    private static final String NOTIF_ALIAS = "notifications";

    /** Referensi statis untuk menerima event dari service. */
    private static RideTrackingPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    // ---------- Status sesi ----------

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject status = new JSObject();
        JSONObject dbSession = TripDb.get(getContext()).getSession();
        boolean serviceActive = RideForegroundService.isRecording();

        // Sesi "recording" di DB tapi service mati = service berhenti tak terduga
        boolean orphanSession = !serviceActive && dbSession != null
            && TripDb.STATE_RECORDING.equals(dbSession.optString("state"));

        status.put("serviceActive", serviceActive);
        status.put("orphanSession", orphanSession);
        status.put("pendingSync", TripDb.get(getContext()).pendingCount());
        if (dbSession != null) {
            status.put("clientRef", dbSession.optString("clientRef"));
            status.put("vehicleId", dbSession.optString("vehicleId"));
            status.put("startedAt", dbSession.optLong("startedAt"));
            status.put("distanceKm", dbSession.optDouble("distance", 0));
            status.put("movingSec", (int) (dbSession.optLong("movingMs", 0) / 1000));
            status.put("fixes", dbSession.optInt("fixes", 0));
            status.put("state", dbSession.optString("state"));
        }
        status.put("active", serviceActive);
        call.resolve(status);
    }

    // ---------- Izin ----------

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject r = new JSObject();
        r.put("location", permissionStateLocation());
        r.put("notifications", permissionStateNotifications());
        call.resolve(r);
    }

    private String permissionStateLocation() {
        Context ctx = getContext();
        boolean fine = ContextCompat.checkSelfPermission(ctx,
            Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean coarse = ContextCompat.checkSelfPermission(ctx,
            Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        return fine || coarse ? "granted" : "prompt";
    }

    private String permissionStateNotifications() {
        if (android.os.Build.VERSION.SDK_INT < 33) return "granted";
        boolean ok = ContextCompat.checkSelfPermission(getContext(),
            Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        return ok ? "granted" : "prompt";
    }

    /**
     * Minta izin (dialog sistem). resolve: { location, notifications }.
     */
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if ("granted".equals(permissionStateLocation())) {
            // Izin lokasi sudah ada — cukup minta notifikasi bila perlu
            if (!"granted".equals(permissionStateNotifications())) {
                requestPermissionForAlias(NOTIF_ALIAS, call, "onNotifPermissionResult");
                return;
            }
            JSObject r = new JSObject();
            r.put("location", "granted");
            r.put("notifications", "granted");
            call.resolve(r);
            return;
        }
        requestPermissionForAlias(LOCATION_ALIAS, call, "onLocationPermissionResult");
    }

    @PermissionCallback
    private void onLocationPermissionResult(PluginCall call) {
        String state = permissionStateLocation();
        if ("granted".equals(state) && !"granted".equals(permissionStateNotifications())) {
            // Lanjut minta izin notifikasi (Android 13+)
            requestPermissionForAlias(NOTIF_ALIAS, call, "onNotifPermissionResult");
            return;
        }
        JSObject r = new JSObject();
        r.put("location", state);
        r.put("notifications", permissionStateNotifications());
        call.resolve(r);
    }

    @PermissionCallback
    private void onNotifPermissionResult(PluginCall call) {
        JSObject r = new JSObject();
        r.put("location", permissionStateLocation());
        r.put("notifications", permissionStateNotifications());
        call.resolve(r);
    }

    // ---------- Mulai perjalanan ----------

    /**
     * Mulai sesi + Foreground Service.
     * Options: vehicleId (wajib), source ("auto"|"manual").
     * resolve:
     *   { started: true, startedAt, clientRef }
     *   { started: false, reason: "permission" | "gps_off" }
     *   { started: false, reason: "already_active", startedAt, distanceKm }
     */
    @PluginMethod
    public void start(PluginCall call) {
        String vehicleId = call.getString("vehicleId");
        if (vehicleId == null || vehicleId.isEmpty()) {
            call.reject("vehicleId wajib diisi");
            return;
        }

        if (!"granted".equals(permissionStateLocation())) {
            JSObject r = new JSObject();
            r.put("started", false);
            r.put("reason", "permission");
            call.resolve(r);
            return;
        }

        if (!isGpsEnabled()) {
            JSObject r = new JSObject();
            r.put("started", false);
            r.put("reason", "gps_off");
            call.resolve(r);
            return;
        }

        // Anti sesi ganda: kalau service sudah merekam, laporkan (UI lanjut)
        if (RideForegroundService.isRecording()) {
            JSONObject snap = RideForegroundService.statusSnapshot();
            JSObject r = new JSObject();
            r.put("started", false);
            r.put("reason", "already_active");
            if (snap != null) {
                r.put("startedAt", snap.optLong("startedAt"));
                r.put("distanceKm", snap.optDouble("distanceKm", 0));
            }
            call.resolve(r);
            return;
        }

        String clientRef = "n-" + UUID.randomUUID().toString();
        long startedAt = System.currentTimeMillis();
        String source = "auto".equals(call.getString("source")) ? "auto" : "manual";

        Intent intent = new Intent(getContext(), RideForegroundService.class);
        intent.setAction(RideForegroundService.ACTION_START);
        intent.putExtra("freshStart", true);
        intent.putExtra("clientRef", clientRef);
        intent.putExtra("vehicleId", vehicleId);
        intent.putExtra("userId", call.getString("userId") != null ? call.getString("userId") : "");
        intent.putExtra("source", source);
        intent.putExtra("startedAt", startedAt);
        try {
            ContextCompat.startForegroundService(getContext(), intent);
        } catch (Exception e) {
            call.reject("Gagal menjalankan layanan GPS: " + e.getMessage());
            return;
        }

        JSObject r = new JSObject();
        r.put("started", true);
        r.put("clientRef", clientRef);
        r.put("startedAt", startedAt);
        call.resolve(r);
    }

    /** Lanjutkan sesi yatim (service mati tak terduga) — hidupkan service lagi. */
    @PluginMethod
    public void resume(PluginCall call) {
        JSONObject session = TripDb.get(getContext()).getSession();
        if (session == null || !TripDb.STATE_RECORDING.equals(session.optString("state"))) {
            JSObject r = new JSObject();
            r.put("resumed", false);
            r.put("reason", "no_session");
            call.resolve(r);
            return;
        }
        if (RideForegroundService.isRecording()) {
            JSObject r = new JSObject();
            r.put("resumed", true);
            r.put("already", true);
            call.resolve(r);
            return;
        }
        if (!"granted".equals(permissionStateLocation())) {
            JSObject r = new JSObject();
            r.put("resumed", false);
            r.put("reason", "permission");
            call.resolve(r);
            return;
        }
        Intent intent = new Intent(getContext(), RideForegroundService.class);
        intent.setAction(RideForegroundService.ACTION_START);
        // tanpa freshStart → service memulihkan sesi dari TripDb
        ContextCompat.startForegroundService(getContext(), intent);
        JSObject r = new JSObject();
        r.put("resumed", true);
        call.resolve(r);
    }

    // ---------- Selesai / buang ----------

    @PluginMethod
    public void finish(PluginCall call) {
        if (!RideForegroundService.isRecording()) {
            // Sesi mungkin sudah selesai lewat notifikasi — laporkan jujur
            JSONObject dbSession = TripDb.get(getContext()).getSession();
            JSObject r = new JSObject();
            r.put("stopped", true);
            r.put("alreadyStopped", true);
            r.put("saved", dbSession == null || !TripDb.STATE_RECORDING.equals(dbSession.optString("state")));
            call.resolve(r);
            return;
        }
        Intent intent = new Intent(getContext(), RideForegroundService.class);
        intent.setAction(RideForegroundService.ACTION_FINISH);
        getContext().startService(intent);
        JSObject r = new JSObject();
        r.put("stopped", true);
        call.resolve(r);
        // Hasil final dikirim lewat event onTripFinished
    }

    @PluginMethod
    public void discard(PluginCall call) {
        Intent intent = new Intent(getContext(), RideForegroundService.class);
        intent.setAction(RideForegroundService.ACTION_DISCARD);
        try {
            getContext().startService(intent);
        } catch (Exception ignored) {
        }
        JSObject r = new JSObject();
        r.put("discarded", true);
        call.resolve(r);
    }

    private boolean isGpsEnabled() {
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) return false;
        try {
            return lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
                || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception e) {
            return false;
        }
    }

    // ---------- Event dari service ke WebView ----------

    static void notifyUpdate(Context ctx, double distanceKm, long durationSec, long movingSec, int fixes) {
        RideTrackingPlugin p = instance;
        if (p == null) return;
        try {
            JSObject data = new JSObject();
            data.put("distanceKm", distanceKm);
            data.put("durationSec", durationSec);
            data.put("movingSec", movingSec);
            data.put("fixes", fixes);
            p.notifyListeners("onTripUpdate", data);
        } catch (Exception ignored) {
        }
    }

    static void notifyFinished(Context ctx, boolean saved, boolean synced,
                               double distanceKm, int durationSec, int movingSec, String clientRef) {
        RideTrackingPlugin p = instance;
        if (p == null) return;
        try {
            JSObject data = new JSObject();
            data.put("saved", saved);
            data.put("synced", synced);
            data.put("distanceKm", distanceKm);
            data.put("durationSec", durationSec);
            data.put("movingSec", movingSec);
            data.put("clientRef", clientRef);
            data.put("pendingSync", TripDb.get(ctx).pendingCount());
            p.notifyListeners("onTripFinished", data);
        } catch (Exception ignored) {
        }
    }
}
