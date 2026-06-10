import webpush from 'web-push';

export function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@quintessence.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
) {
  configureWebPush();
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
    // TTL=0 (default) drops the notification if the device is offline at send
    // time — common for iOS when the screen is off.  43200 s (12 h) tells
    // APNs / FCM to hold and redeliver within the same day.
    { TTL: 43200 }
  );
}