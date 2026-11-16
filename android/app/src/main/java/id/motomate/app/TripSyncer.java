package id.motomate.app;

import android.content.Context;
import android.webkit.CookieManager;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

import javax.net.ssl.HttpsURLConnection;

/**
 * TripSyncer — mengirim perjalanan selesai ke backend MotoMate.
 *
 * Ketentuan sinkronisasi (anti-duplikat):
 *  - Setiap trip memiliki `clientRef` unik; server mengenali trip yang sudah
 *    masuk sehingga pengiriman ulang TIDAK menghasilkan dua catatan.
 *  - Otentikasi memakai cookie sesi mm_session milik WebView (dibaca lewat
 *    CookieManager — cookie httpOnly tetap bisa dibaca di sisi native).
 *  - Internet putus → trip tetap aman di TripDb; dikirim ulang otomatis
 *    ketika koneksi kembali (dipicu NetworkCallback / mulai layanan).
 */
public class TripSyncer {

    /** URL deployment web MotoMate — HARUS sama dengan capacitor.config.ts */
    public static final String SERVER_URL = "https://aplikasi-motor.vercel.app";

    public interface Result {
        int OK = 0;               // terkirim / sudah dikenali server
        int RETRY_LATER = 1;      // jaringan / server bermasalah / 401 / 429
        int DROP = 2;             // ditolak permanen (400/404/422)
    }

    /** Kirim seluruh antrean milik sesi ini. Return sisa yang masih menunggu. */
    public static int flushAll(Context ctx) {
        TripDb db = TripDb.get(ctx);
        int guard = 0;
        while (guard++ < 50) {
            JSONObject trip = db.peekPendingTrip();
            if (trip == null) break;
            int result = postTrip(ctx, trip);
            String ref = trip.optString("clientRef");
            if (result == Result.OK) {
                db.deletePendingTrip(ref);
            } else if (result == Result.DROP) {
                // Ditoleransi hilang hanya bila server menolak datanya
                db.deletePendingTrip(ref);
            } else {
                db.bumpAttempts(ref);
                break; // berhenti — coba lagi nanti
            }
        }
        return db.pendingCount();
    }

    /** POST satu trip. Return salah satu Result.* */
    public static int postTrip(Context ctx, JSONObject trip) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(SERVER_URL + "/api/trips");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(30000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");

            // Cookie sesi dari WebView (httpOnly tetap terbaca di sini)
            String cookie = CookieManager.getInstance().getCookie(SERVER_URL);
            if (cookie != null && !cookie.isEmpty()) {
                conn.setRequestProperty("Cookie", cookie);
            }

            JSONObject body = new JSONObject();
            body.put("clientRef", trip.getString("clientRef"));
            body.put("vehicleId", trip.getString("vehicleId"));
            body.put("distance", trip.getDouble("distance"));
            body.put("duration", trip.getInt("duration"));
            body.put("movingSec", trip.optInt("movingSec", 0));
            body.put("source", trip.optString("source", "manual"));
            String path = trip.optString("path", null);
            if (path != null && path.length() > 4) body.put("path", path);
            java.text.SimpleDateFormat iso =
                new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US);
            iso.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            body.put("startedAt", iso.format(new java.util.Date(trip.getLong("startedAt"))));
            body.put("endedAt", iso.format(new java.util.Date(trip.getLong("endedAt"))));

            OutputStream os = conn.getOutputStream();
            os.write(body.toString().getBytes(StandardCharsets.UTF_8));
            os.flush();
            os.close();

            int status = conn.getResponseCode();
            // Baca respons (200 = sudah ada → idempoten, 201 = baru dibuat)
            try {
                BufferedReader r = new BufferedReader(new InputStreamReader(
                    status >= 400 ? conn.getErrorStream() : conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
                r.close();
            } catch (Exception ignored) {
            }

            if (status == 200 || status == 201) return Result.OK;
            if (status == 400 || status == 404 || status == 422) return Result.DROP;
            return Result.RETRY_LATER; // 401 sesi habis, 429, 5xx, dll.
        } catch (Exception e) {
            return Result.RETRY_LATER; // offline / timeout
        } finally {
            if (conn != null) {
                try {
                    if (conn instanceof HttpsURLConnection) {
                        // noop — hanya memastikan tipe aman
                    }
                    conn.disconnect();
                } catch (Exception ignored) {
                }
            }
        }
    }

    /** Baca cookie WebView (dipakai untuk cek login). */
    public static String sessionCookie(Context ctx) {
        return CookieManager.getInstance().getCookie(SERVER_URL);
    }

    /** Ambil field JSON dengan aman. */
    public static String optStr(JSONObject o, String key) {
        Iterator<String> it = o.keys();
        while (it.hasNext()) {
            String k = it.next();
            if (k.equals(key)) {
                try {
                    return o.getString(k);
                } catch (Exception ignored) {
                    return null;
                }
            }
        }
        return null;
    }
}
