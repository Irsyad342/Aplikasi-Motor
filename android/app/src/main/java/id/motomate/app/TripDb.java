package id.motomate.app;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * TripDb — penyimpanan lokal (SQLite) untuk perekaman perjalanan native.
 *
 * Tujuan (ketentuan offline):
 *  - Data perjalanan TETAP tersimpan saat internet terputus.
 *  - Koordinat GPS tersimpan lokal (tabel ride_point, maks 2500 titik).
 *  - Sesi aktif bertahan saat proses dimatikan sistem (tabel ride_session).
 *  - Perjalanan selesai yang belum terkirim masuk antrean (ride_trip_pending)
 *    dan tidak pernah menduplikasi data (clientRef idempoten di server).
 *
 * Tidak bergantung pada koneksi internet — sinkronisasi dilakukan TripSyncer.
 */
public class TripDb extends SQLiteOpenHelper {

    private static final String DB_NAME = "motomate_ride.db";
    private static final int DB_VERSION = 1;

    private static final int MAX_POINTS = 2500;

    // Tabel sesi aktif (singleton, id = 1)
    public static final String STATE_RECORDING = "recording";
    public static final String STATE_FINISHED = "finished";

    private static TripDb instance;

    public static synchronized TripDb get(Context context) {
        if (instance == null) {
            instance = new TripDb(context.getApplicationContext());
        }
        return instance;
    }

    private TripDb(Context context) {
        super(context, DB_NAME, null, DB_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(
            "CREATE TABLE ride_session (" +
            " id INTEGER PRIMARY KEY CHECK (id = 1)," +
            " client_ref TEXT NOT NULL," +
            " vehicle_id TEXT NOT NULL," +
            " user_id TEXT NOT NULL," +
            " source TEXT NOT NULL," +
            " started_at INTEGER NOT NULL," +
            " distance REAL NOT NULL DEFAULT 0," +
            " moving_ms INTEGER NOT NULL DEFAULT 0," +
            " fixes INTEGER NOT NULL DEFAULT 0," +
            " last_lat REAL," +
            " last_lng REAL," +
            " last_ts INTEGER NOT NULL DEFAULT 0," +
            " state TEXT NOT NULL DEFAULT 'recording')"
        );
        db.execSQL(
            "CREATE TABLE ride_point (" +
            " seq INTEGER PRIMARY KEY AUTOINCREMENT," +
            " lat REAL NOT NULL," +
            " lng REAL NOT NULL," +
            " ts INTEGER NOT NULL)"
        );
        db.execSQL(
            "CREATE TABLE ride_trip_pending (" +
            " client_ref TEXT PRIMARY KEY," +
            " vehicle_id TEXT NOT NULL," +
            " distance REAL NOT NULL," +
            " duration INTEGER NOT NULL," +
            " moving_sec INTEGER NOT NULL," +
            " source TEXT NOT NULL," +
            " path TEXT," +
            " started_at INTEGER NOT NULL," +
            " ended_at INTEGER NOT NULL," +
            " attempts INTEGER NOT NULL DEFAULT 0," +
            " queued_at INTEGER NOT NULL)"
        );
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS ride_session");
        db.execSQL("DROP TABLE IF EXISTS ride_point");
        db.execSQL("DROP TABLE IF EXISTS ride_trip_pending");
        onCreate(db);
    }

    // ---------- Sesi aktif ----------

    /** Mulai sesi baru; bila ada sesi lama yang masih "recording" akan ditimpa
     *  setelah perjalanannya dipertahankan sebagai pending trip bila layak. */
    public synchronized JSONObject startSession(String clientRef, String vehicleId, String userId, String source, long startedAt) {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            // Tidak boleh ada dua sesi aktif: kalau masih ada, tutup dulu
            JSONObject old = readSession(db);
            if (old != null && STATE_RECORDING.equals(old.optString("state"))) {
                // Simpan progres lama sebagai trip belum final (agar tidak hilang),
                // lalu hapus sesi.
                saveLeftoverAsPending(db, old);
            }
            db.execSQL("DELETE FROM ride_session");
            db.execSQL("DELETE FROM ride_point");
            ContentValues cv = new ContentValues();
            cv.put("id", 1);
            cv.put("client_ref", clientRef);
            cv.put("vehicle_id", vehicleId);
            cv.put("user_id", userId);
            cv.put("source", source);
            cv.put("started_at", startedAt);
            cv.put("state", STATE_RECORDING);
            db.insert("ride_session", null, cv);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
        return getSession();
    }

    private void saveLeftoverAsPending(SQLiteDatabase db, JSONObject old) {
        try {
            long startedAt = old.getLong("startedAt");
            double distance = old.getDouble("distance");
            // Tanpa data GPS nyata → tidak disimpan (sesuai aturan web)
            if (distance < 0.01 || old.optInt("fixes", 0) == 0) return;
            long endedAt = old.optLong("lastTs", System.currentTimeMillis());
            if (endedAt <= startedAt) endedAt = System.currentTimeMillis();
            int duration = (int) Math.max(1, (endedAt - startedAt) / 1000);
            String path = readPointsJson(db);
            ContentValues cv = new ContentValues();
            String ref = old.optString("client_ref");
            if (ref == null || ref.length() < 4) ref = "left-" + startedAt;
            cv.put("client_ref", ref);
            cv.put("vehicle_id", old.getString("vehicle_id"));
            cv.put("distance", distance);
            cv.put("duration", duration);
            cv.put("moving_sec", (int) (old.optLong("movingMs", 0) / 1000));
            cv.put("source", old.optString("source", "manual"));
            cv.put("path", path);
            cv.put("started_at", startedAt);
            cv.put("ended_at", endedAt);
            cv.put("queued_at", System.currentTimeMillis());
            db.insertWithOnConflict("ride_trip_pending", null, cv, SQLiteDatabase.CONFLICT_IGNORE);
        } catch (Exception e) {
            // Sesi lama tidak layak disimpan — abaikan
        }
    }

    private JSONObject readSession(SQLiteDatabase db) {
        Cursor c = db.rawQuery("SELECT client_ref, vehicle_id, user_id, source, started_at, distance, moving_ms, fixes, last_lat, last_lng, last_ts, state FROM ride_session WHERE id = 1", null);
        JSONObject o = null;
        try {
            if (c.moveToFirst()) {
                o = new JSONObject();
                o.put("clientRef", c.getString(0));
                o.put("vehicleId", c.getString(1));
                o.put("userId", c.getString(2));
                o.put("source", c.getString(3));
                o.put("startedAt", c.getLong(4));
                o.put("distance", c.getDouble(5));
                o.put("movingMs", c.getLong(6));
                o.put("fixes", c.getInt(7));
                if (!c.isNull(8)) o.put("lastLat", c.getDouble(8));
                if (!c.isNull(9)) o.put("lastLng", c.getDouble(9));
                o.put("lastTs", c.getLong(10));
                o.put("state", c.getString(11));
            }
        } catch (Exception ignored) {
        } finally {
            c.close();
        }
        return o;
    }

    /** Sesi aktif (atau null) — dipakai plugin untuk pulihkan status. */
    public synchronized JSONObject getSession() {
        return readSession(getReadableDatabase());
    }

    public synchronized void clearSession() {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            db.execSQL("DELETE FROM ride_session");
            db.execSQL("DELETE FROM ride_point");
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    /** Update progres sesi + simpan titik (dipanggil per fix GPS yang diterima). */
    public synchronized void updateSession(double distance, long movingMs, int fixes, Double lat, Double lng, long ts, boolean addPoint) {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            ContentValues cv = new ContentValues();
            cv.put("distance", distance);
            cv.put("moving_ms", movingMs);
            cv.put("fixes", fixes);
            if (lat != null) cv.put("last_lat", lat);
            if (lng != null) cv.put("last_lng", lng);
            cv.put("last_ts", ts);
            cv.put("state", STATE_RECORDING);
            db.update("ride_session", cv, "id = 1", null);
            if (addPoint && lat != null && lng != null) {
                ContentValues p = new ContentValues();
                p.put("lat", lat);
                p.put("lng", lng);
                p.put("ts", ts);
                db.insert("ride_point", null, p);
                // Batasi jumlah titik — hapus yang paling lama
                db.execSQL(
                    "DELETE FROM ride_point WHERE seq NOT IN " +
                    "(SELECT seq FROM ride_point ORDER BY seq DESC LIMIT " + MAX_POINTS + ")"
                );
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    /** Finalisasi: tandai sesi selesai (dipanggil sebelum dipindah ke pending). */
    public synchronized void markFinished() {
        getWritableDatabase().execSQL("UPDATE ride_session SET state = '" + STATE_FINISHED + "' WHERE id = 1");
    }

    private String readPointsJson(SQLiteDatabase db) {
        Cursor c = db.rawQuery("SELECT lat, lng FROM ride_point ORDER BY seq ASC", null);
        JSONArray arr = new JSONArray();
        try {
            while (c.moveToNext()) {
                JSONArray pt = new JSONArray();
                try {
                    pt.put(c.getDouble(0));
                    pt.put(c.getDouble(1));
                } catch (org.json.JSONException e) {
                    // Baris tidak valid — lewati titik ini
                    continue;
                }
                arr.put(pt);
            }
        } finally {
            c.close();
        }
        return arr.length() >= 2 ? arr.toString() : null;
    }

    /** Ambil rute JSON sesi aktif (untuk finalisasi trip). */
    public synchronized String getPointsJson() {
        return readPointsJson(getReadableDatabase());
    }

    // ---------- Antrean trip selesai (offline-first) ----------

    /** Masukkan trip final ke antrean kirim. Duplikat (clientRef sama) diabaikan. */
    public synchronized void enqueuePendingTrip(String clientRef, String vehicleId, double distance,
                                                int duration, int movingSec, String source,
                                                String path, long startedAt, long endedAt) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("client_ref", clientRef);
        cv.put("vehicle_id", vehicleId);
        cv.put("distance", distance);
        cv.put("duration", duration);
        cv.put("moving_sec", movingSec);
        cv.put("source", source);
        cv.put("path", path);
        cv.put("started_at", startedAt);
        cv.put("ended_at", endedAt);
        cv.put("queued_at", System.currentTimeMillis());
        db.insertWithOnConflict("ride_trip_pending", null, cv, SQLiteDatabase.CONFLICT_IGNORE);
    }

    /** Jumlah trip menunggu sinkronisasi. */
    public synchronized int pendingCount() {
        Cursor c = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM ride_trip_pending", null);
        int n = 0;
        try {
            if (c.moveToFirst()) n = c.getInt(0);
        } finally {
            c.close();
        }
        return n;
    }

    /** Ambil satu trip tertua yang belum terkirim (null bila kosong). */
    public synchronized JSONObject peekPendingTrip() {
        Cursor c = getReadableDatabase().rawQuery(
            "SELECT client_ref, vehicle_id, distance, duration, moving_sec, source, path, started_at, ended_at, attempts FROM ride_trip_pending ORDER BY queued_at ASC LIMIT 1", null);
        JSONObject o = null;
        try {
            if (c.moveToFirst()) {
                o = new JSONObject();
                o.put("clientRef", c.getString(0));
                o.put("vehicleId", c.getString(1));
                o.put("distance", c.getDouble(2));
                o.put("duration", c.getInt(3));
                o.put("movingSec", c.getInt(4));
                o.put("source", c.getString(5));
                if (!c.isNull(6)) o.put("path", c.getString(6));
                o.put("startedAt", c.getLong(7));
                o.put("endedAt", c.getLong(8));
                o.put("attempts", c.getInt(9));
            }
        } catch (Exception ignored) {
        } finally {
            c.close();
        }
        return o;
    }

    public synchronized void deletePendingTrip(String clientRef) {
        getWritableDatabase().delete("ride_trip_pending", "client_ref = ?", new String[]{clientRef});
    }

    public synchronized void bumpAttempts(String clientRef) {
        getWritableDatabase().execSQL(
            "UPDATE ride_trip_pending SET attempts = attempts + 1 WHERE client_ref = ?",
            new String[]{clientRef});
    }
}
