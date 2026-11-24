package com.projectmahem.stabilityos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FamilyDnsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
