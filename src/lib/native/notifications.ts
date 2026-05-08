import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { supabase } from "@/integrations/supabase/client";
import { playNewOrderAlert } from "@/lib/audio/beep";

export const isNative = (): boolean => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

let initialized = false;

/** Request native permissions and register for push. Safe to call many times. */
export const initNativeNotifications = async (
  opts: { userId?: string; restaurantId?: string } = {},
): Promise<void> => {
  if (!isNative() || initialized) return;
  initialized = true;

  try {
    await LocalNotifications.requestPermissions();
  } catch { /* ignore */ }

  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive === "granted") {
      await PushNotifications.register();

      PushNotifications.addListener("registration", async (t) => {
        if (!opts.userId) return;
        try {
          await supabase.from("push_tokens").upsert(
            {
              user_id: opts.userId,
              restaurant_id: opts.restaurantId ?? null,
              platform: Capacitor.getPlatform() === "ios" ? "ios" : "android",
              token: t.value,
            },
            { onConflict: "user_id,token" },
          );
        } catch { /* ignore */ }
      });

      PushNotifications.addListener("pushNotificationReceived", () => {
        notifyNewOrder("Nouvelle notification", "");
      });
    }
  } catch { /* ignore */ }
};

/** Play sound + vibrate + show notification when a new order arrives. */
export const notifyNewOrder = async (
  title = "Nouvelle commande",
  body = "Une commande vient d'arriver",
): Promise<void> => {
  // Always play the audible beep (works in browser too)
  try { playNewOrderAlert(); } catch { /* ignore */ }

  if (!isNative()) return;

  try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch { /* ignore */ }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 1_000_000),
          title,
          body,
          schedule: { at: new Date(Date.now() + 100) },
          sound: undefined,
          smallIcon: "ic_stat_icon_config_sample",
        },
      ],
    });
  } catch { /* ignore */ }
};