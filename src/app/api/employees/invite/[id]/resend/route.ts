import crypto from "crypto";
import { NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { getAppBaseUrl, sendEmployeeInviteEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, clinicId } = await requireClinicPermission("employees.invite");
    const inviteId = Number((await params).id);
    const invite = await prisma.employeeInvite.findFirst({
      where: { id: inviteId, clinicId, acceptedAt: null },
      include: {
        clinic: { select: { name: true } },
        role: { select: { id: true, name: true, isActive: true } },
        invitedUser: { select: { id: true, name: true } },
      },
    });

    if (!invite) return NextResponse.json({ error: "Invitación no disponible" }, { status: 404 });
    if (!invite.role.isActive) return NextResponse.json({ error: "El rol asignado ya no está disponible" }, { status: 409 });

    const userId = invite.invitedUser?.id;
    if (!userId) return NextResponse.json({ error: "La cuenta invitada no está disponible" }, { status: 409 });

    const temporaryPassword = crypto.randomBytes(10).toString("hex");
    const password = await hashPassword(temporaryPassword);
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);

    await prisma.$transaction(async (tx) => {
      await tx.account.updateMany({ where: { userId, providerId: "credential" }, data: { password } });
      await tx.user.update({ where: { id: userId }, data: { mustChangePassword: true } });
      await tx.employeeInvite.update({ where: { id: invite.id }, data: { tokenHash, expiresAt, createdById: session.user.id } });
    });

    await sendEmployeeInviteEmail({
      clinicName: invite.clinic.name,
      employeeName: invite.invitedUser?.name,
      expiresAt,
      inviteUrl: `${getAppBaseUrl()}/accept-invite?token=${token}`,
      invitedByName: session.user.name ?? null,
      roleName: invite.role.name,
      tempPassword: temporaryPassword,
      to: invite.email,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo reenviar la invitación" }, { status: 500 });
  }
}