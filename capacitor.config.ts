import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Konfigurasi Capacitor — pembungkus native Android untuk MotoMate.
 * Aplikasi Android memuat UI web MotoMate langsung dari server produksi
 * (server.url), sehingga seluruh fitur web, autentikasi, dan data tetap
 * identik. Plugin native `RideTracking` menyediakan Foreground Service
 * GPS agar pencatatan perjalanan tetap berjalan saat layar terkunci.
 */
const config: CapacitorConfig = {
  appId: 'id.motomate.app',
  appName: 'MotoMate',
  webDir: 'public',
  server: {
    // UI web dimuat dari deployment produksi — satu sumber untuk web & Android
    url: 'https://aplikasi-motor.vercel.app',
    cleartext: false,
    // Jaga sesi tetap hidup di WebView
    allowNavigation: ['aplikasi-motor.vercel.app', 'localhost'],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchFadeOutDuration: 350,
      backgroundColor: '#0A2018',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
}

export default config
