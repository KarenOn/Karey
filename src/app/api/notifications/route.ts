import { NextResponse } from "next/server";
import { getActiveClinicMembershipForUser } from "@/lib/auth";
import { getSessionOrThrow, isSessionUserGlobalAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { canReceiveNotification, NOTIFICATION_REQUIRED_PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const membership = await getActiveClinicMembershipForUser(session.user.id);
    const isGlobalAdmin = await isSessionUserGlobalAdmin(session.user.id, session.user.role);
    if (!membership && !isGlobalAdmin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const scope = isGlobalAdmin ? { channel: "IN_APP" as const } : { clinicId: membership!.clinicId, channel: "IN_APP" as const };
    const mappedTypes = Object.keys(NOTIFICATION_REQUIRED_PERMISSIONS);
    const allowedMappedTypes = membership
      ? mappedTypes.filter((type) => canReceiveNotification(type, membership.role.permissions))
      : mappedTypes;
    const notificationScope = {
      ...scope,
      OR: [
        { type: { notIn: mappedTypes } },
        ...(allowedMappedTypes.length ? [{ type: { in: allowedMappedTypes } }] : []),
      ],
    };
    const rows = await prisma.notificationRecipient.findMany({
      where: { userId: session.user.id, notification: notificationScope },
      orderBy: { notification: { createdAt: "desc" } },
      take: 20,
      select: { id: true, readAt: true, notification: { select: { id: true, type: true, title: true, message: true, targetUrl: true, createdAt: true } } },
    });
    const unreadCount = await prisma.notificationRecipient.count({ where: { userId: session.user.id, readAt: null, notification: notificationScope } });
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
    const isGlobalAdmin = await isSessionUserGlobalAdmin(session.user.id, session.user.role);
    if (!membership && !isGlobalAdmin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const scope = isGlobalAdmin ? { channel: "IN_APP" as const } : { clinicId: membership!.clinicId, channel: "IN_APP" as const };
    const mappedTypes = Object.keys(NOTIFICATION_REQUIRED_PERMISSIONS);
    const allowedMappedTypes = membership
      ? mappedTypes.filter((type) => canReceiveNotification(type, membership.role.permissions))
      : mappedTypes;
    const notificationScope = {
      ...scope,
      OR: [
        { type: { notIn: mappedTypes } },
        ...(allowedMappedTypes.length ? [{ type: { in: allowedMappedTypes } }] : []),
      ],
    };
    const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Notificación inválida" }, { status: 422 });
    const updated = await prisma.notificationRecipient.updateMany({ where: { id: parsed.data.id, userId: session.user.id, notification: notificationScope }, data: { readAt: new Date() } });
    if (!updated.count) return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: "No se pudo marcar la notificación" }, { status });
  }
}
