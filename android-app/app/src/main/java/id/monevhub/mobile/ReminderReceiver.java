package id.monevhub.mobile;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class ReminderReceiver extends BroadcastReceiver {

    public static final String CHANNEL_ID = "monevhub_absen_reminder";
    private static final int NOTIF_ID = 2026;

    @Override
    public void onReceive(Context context, Intent intent) {
        SharedPreferences prefs = context.getSharedPreferences("monevhub_prefs", Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("reminder_enabled", true);
        boolean isTest = intent != null && intent.getBooleanExtra("is_test", false);
        if (!enabled && !isTest) return;

        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        String lastReportedDate = prefs.getString("last_reported_date", "");
        if (!isTest && today.equals(lastReportedDate)) {
            // Sudah isi laporan hari ini -> tidak perlu kirim notifikasi
            scheduleNext(context);
            return;
        }

        String name = prefs.getString("participant_name", "").trim();
        if (name.isEmpty()) name = "Peserta MagangHub";

        showReminderNotification(context, name);
        if (!isTest) scheduleNext(context);
    }

    public static void showReminderNotification(Context context, String participantName) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID,
                "Pengingat Laporan Absen",
                NotificationManager.IMPORTANCE_HIGH
            );
            ch.setDescription("Mengingatkan pengisian laporan harian MagangHub sebelum 23:59 WIB");
            nm.createNotificationChannel(ch);
        }

        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.putExtra("open_riwayat", true);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(context, 101, openIntent, flags);

        String body = "Halo " + participantName + ", sepertinya anda belum melakukan laporan, silahkan isi laporan sekarang (batas 23:59 WIB).";
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Jangan Lupa Isi Laporan Absen")
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi);

        nm.notify(NOTIF_ID, builder.build());
    }

    public static void scheduleNext(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("monevhub_prefs", Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("reminder_enabled", true);
        int hour = prefs.getInt("reminder_hour", 17);
        int minute = prefs.getInt("reminder_minute", 0);
        scheduleDailyReminder(context, enabled, hour, minute);
    }

    public static void scheduleDailyReminder(Context context, boolean enabled, int hour, int minute) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent i = new Intent(context, ReminderReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getBroadcast(context, 201, i, flags);

        if (!enabled) {
            am.cancel(pi);
            return;
        }

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, minute);
        cal.set(Calendar.SECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
            cal.add(Calendar.DAY_OF_MONTH, 1);
        }

        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pi);
    }
}
