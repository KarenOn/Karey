import { NextResponse } from "next/server";
import { getActiveClinicMembershipForUser } from "@/lib/auth";
import { getSessionOrThrow } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const membership = await getActiveClinicMembershipForUser(session.user.id);
    if (!membership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const rows = await prisma.notificationRecipient.findMany({
      where: { userId: session.user.id, notification: { clinicId: membership.clinicId, channel: "IN_APP" } },
      orderBy: { notification: { createdAt: "desc" } },
      take: 20,
      select: { id: true, readAt: true, notification: { select: { id: true, type: true, title: true, message: true, targetUrl: true, createdAt: true } } },
    });
    const unreadCount = await prisma.notificationRecipient.count({ where: { userId: session.user.id, readAt: null, notification: { clinicId: membership.clinicId, channel: "IN_APP" } } });
    return NextResponse.json({ unreadCount, notifications: rows.map((row) => ({ ...row.notification, id: row.id, readAt: row.readAt?.toISOString() ?? null, createdAt: row.notification.createdAt.toISOString() })) });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: "No se pudieron cargar las notificaciones" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow();
    const membership = await getActiveClinicMembershipForUser(session.user.id);
    if (!membership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Notificación inválida" }, { status: 422 });
    const updated = await prisma.notificationRecipient.updateMany({ where: { id: parsed.data.id, userId: session.user.id, notification: { clinicId: membership.clinicId, channel: "IN_APP" } }, data: { readAt: new Date() } });
    if (!updated.count) return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: "No se pudo marcar la notificación" }, { status });
  }
}
