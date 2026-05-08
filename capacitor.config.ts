import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.c93390b35d5f488191c31deb382d2107",
  appName: "resto-flow-afrik",
  webDir: "dist",
  // Hot-reload from the Lovable sandbox during development.
  // Remove the `server` block before producing a production build for the stores.
  server: {
    url: "https://c93390b3-5d5f-4881-91c3-1deb382d2107.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#ea580c",
      sound: "beep.wav",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;