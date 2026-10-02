package ai.laptopguard.mobile;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "LaptopGuardUpdater")
public class LaptopGuardUpdaterPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void installApk(PluginCall call) {
        String apkUrl = call.getString("url");
        String bearerToken = call.getString("token");
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            call.reject("APK update URL is required.");
            return;
        }

        executor.execute(() -> {
            try {
                File apkFile = new File(getContext().getCacheDir(), "LaptopGuard-AI-update.apk");
                downloadApk(apkUrl, bearerToken, apkFile);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
                    Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    settingsIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(settingsIntent);
                    JSObject ret = new JSObject();
                    ret.put("status", "permission_required");
                    ret.put("message", "Allow install unknown apps for LaptopGuard, then run update again.");
                    call.resolve(ret);
                    return;
                }

                Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apkFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getContext().startActivity(installIntent);

                JSObject ret = new JSObject();
                ret.put("status", "installer_opened");
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Update failed.");
            }
        });
    }

    private void downloadApk(String apkUrl, String bearerToken, File target) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(apkUrl).openConnection();
        if (bearerToken != null && !bearerToken.trim().isEmpty()) {
            connection.setRequestProperty("Authorization", "Bearer " + bearerToken.trim());
        }
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(60000);
        connection.connect();

        int total = connection.getContentLength();
        int downloaded = 0;
        byte[] buffer = new byte[16 * 1024];

        try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(target, false)) {
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                downloaded += read;
                JSObject progress = new JSObject();
                progress.put("bytesRead", downloaded);
                progress.put("totalBytes", total);
                progress.put("progress", total > 0 ? Math.min(100, Math.round((downloaded * 100f) / total)) : 0);
                notifyListeners("downloadProgress", progress);
            }
        } finally {
            connection.disconnect();
        }
    }
}
