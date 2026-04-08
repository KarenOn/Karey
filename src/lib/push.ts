import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@localhost";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

type Payload = { title: string; body: string; url?: string };

export async function sendPushToClinic(clinicId: number, payload: Payload) {
  const subs = await prisma.pushSubscription.findMany({
    where: { clinicId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  const results = await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // 410/404 => subscription muerta, bórrala
        const code = err?.statusCode;
        if (code === 410 || code === 404) {
          await prisma.pushSubscription.delete({ where: { id: s.id } });
        }
        throw err;
      }
    })
  );

  return results;
}
