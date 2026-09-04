import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { syncUserRoleFromMembership } from "@/lib/current-user-profile";

const AcceptSchema = z.object({
  token: z.string().min(10),
});

async function findInvite(token: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return prisma.employeeInvite.findUnique({
    where: { tokenHash },
    include: {
      clinic: { select: { name: true, isActive: true } },
      role: { select: { key: true, name: true, isActive: true } },
    },
  });
}

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    const parsed = AcceptSchema.safeParse({ token });
    if (!parsed.success) return NextResponse.json({ state: "invalid" }, { status: 400 });

    const invite = await findInvite(parsed.data.token);
    if (!invite) return NextResponse.json({ state: "invalid" }, { status: 404 });

    const session = await auth.api.getSession({ headers: await headers() });
    const now = new Date();
    const state = invite.acceptedAt
      ? "accepted"
      : invite.expiresAt <= now
        ? "expired"
        : !invite.clinic.isActive || !invite.role.isActive
          ? "unavailable"
          : "pending";

    return NextResponse.json({
      state,
      invitation: {
        email: invite.email,
        clinicName: invite.clinic.name,
        roleName: invite.role.name,
        expiresAt: invite.expiresAt.toISOString(),
      },
      sessionEmail: session?.user?.email ?? null,
    });
  } catch {
    return NextResponse.json({ state: "invalid" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    if (session.user.banned) return NextResponse.json({ error: "Tu cuenta no puede aceptar invitaciones" }, { status: 403 });
    const { token } = AcceptSchema.parse(await req.json());
    const invite = await findInvite(token);
    if (!invite) return NextResponse.json({ error: "Invitación no válida" }, { status: 404 });
    if (invite.acceptedAt) return NextResponse.json({ error: "Esta invitación ya fue utilizada" }, { status: 409 });
    if (invite.expiresAt <= new Date()) return NextResponse.json({ error: "Esta invitación ha expirado" }, { status: 410 });
    if (!invite.clinic.isActive || !invite.role.isActive) return NextResponse.json({ error: "Esta invitación ya no está disponible" }, { status: 410 });

    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "Este invite no corresponde a tu email" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.clinicMember.upsert({
        where: { clinicId_userId: { clinicId: invite.clinicId, userId: session.user.id } },
        update: { roleId: invite.roleId, isActive: true },
        create: { clinicId: invite.clinicId, userId: session.user.id, roleId: invite.roleId, isActive: true },
      });
      await tx.employeeInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date(), userId: session.user.id },
      });
      await tx.user.update({ where: { id: session.user.id }, data: { role: invite.role.key } });
    });

    await syncUserRoleFromMembership(session.user.id, invite.clinicId);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Datos inválidos";
    const userMessage = ["UNAUTHORIZED", "ACCESS_REVOKED"].includes(message)
      ? "Tu sesión no tiene permiso para aceptar esta invitación"
      : "No se pudo aceptar la invitación";
    return NextResponse.json({ error: userMessage }, { status: message === "UNAUTHORIZED" ? 401 : 422 });
  }
}
