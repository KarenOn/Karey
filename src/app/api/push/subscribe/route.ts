import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PushSubscriptionSchema } from "@/lib/validators/push";
import { zodDetails } from "@/lib/zodDetails"; // tu helper
import { getClinicIdOrFail } from "@/lib/auth"; // ajusta a tu proyecto

export async function POST(req: Request) {
  const clinicId = await getClinicIdOrFail();

  const body = await req.json().catch(() => null);
  const parsed = PushSubscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const sub = parsed.data;

  await prisma.pushSubscription.upsert({
    where: {
      clinicId_endpoint: { clinicId, endpoint: sub.endpoint },
    },
    update: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      updatedAt: new Date(),
    },
    create: {
      clinicId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: req.headers.get("user-agent") ?? null,
      // userId: ...(si lo tienes disponible)
    },
  });

  return NextResponse.json({ ok: true });
}
