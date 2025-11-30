import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.menumap.app',
  appName: 'MenuMap',
  webDir: 'build/client',
  server: {
    // During development, you can use this to point to your local dev server
    // url: 'http://192.168.1.100:5173',
    // cleartext: true
  },
  android: {
    // Allow mixed content for local network connections
    allowMixedContent: true
  }
};

export default config;
