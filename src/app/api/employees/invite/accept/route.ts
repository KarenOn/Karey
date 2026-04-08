import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const AcceptSchema = z.object({
  token: z.string().min(10),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { token } = AcceptSchema.parse(await req.json());
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invite = await prisma.employeeInvite.findFirst({
      where: {
        tokenHash,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!invite) return NextResponse.json({ error: "Invite inválida o expirada" }, { status: 400 });

    // (opcional) validar que el email coincida con el usuario logueado
    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "Este invite no corresponde a tu email" }, { status: 403 });
    }

    // crear membership si no existe
    await prisma.clinicMember.upsert({
      where: { clinicId_userId: { clinicId: invite.clinicId, userId: session.user.id } },
      update: { roleId: invite.roleId, isActive: true },
      create: { clinicId: invite.clinicId, userId: session.user.id, roleId: invite.roleId, isActive: true },
    });

    await prisma.employeeInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), userId: session.user.id },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: "Datos inválidos", details: message }, { status: 422 });
  }
}
