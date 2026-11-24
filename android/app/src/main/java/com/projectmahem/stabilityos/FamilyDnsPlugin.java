package com.projectmahem.stabilityos;

import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.LinkProperties;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FamilyDns")
public class FamilyDnsPlugin extends Plugin {
    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        boolean supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P;
        result.put("supported", supported);
        boolean active = false;
        if (supported) {
            ConnectivityManager manager = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            LinkProperties link = manager.getLinkProperties(manager.getActiveNetwork());
            active = link != null && link.isPrivateDnsActive()
                && "family.cloudflare-dns.com".equalsIgnoreCase(link.getPrivateDnsServerName());
        }
        result.put("active", active);
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            getActivity().startActivity(new Intent(Settings.ACTION_WIRELESS_SETTINGS));
            call.resolve();
        } catch (RuntimeException e) {
            call.reject("Open Network settings on your device.", e);
        }
    }
}
