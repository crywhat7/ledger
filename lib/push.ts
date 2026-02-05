import webPush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webPush.setVapidDetails("mailto:ledger@local", publicKey, privateKey);
}

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function isPushConfigured(): boolean {
  return Boolean(publicKey && privateKey);
}

export async function sendPushNotification(
  subscription: PushSubscriptionPayload,
  payload: { title: string; body?: string; url?: string }
): Promise<void> {
  if (!privateKey || !publicKey) {
    throw new Error("VAPID keys not configured");
  }
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
  });
  await webPush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    },
    body,
    {
      TTL: 60 * 60 * 24,
    }
  );
}

export function getVapidPublicKey(): string | null {
  return publicKey ?? null;
}
