import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emosafeq.app',
  appName: 'EMOSAFEQ',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    BackgroundRunner: {
      label: "com.emosafeq.app.background",
      src: "background.js",
      event: "emergencyCheck",
      repeat: true,
      interval: 15
    }
  }
};

export default config;
