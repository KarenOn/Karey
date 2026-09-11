import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppBaseUrl, sendEmployeeInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { requireClinicPermissions } from "@/lib/server-auth";
import { setTemporaryPasswordForUser } from "@/lib/temporary-password";

const InviteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  roleId: z.number().int(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { session, clinicId } = await requireClinicPermissions(["employees.create", "employees.invite"]);
    const body = InviteSchema.parse(await req.json());
    const email = body.email.toLowerCase();

    const now = new Date();
    const [role, clinic, existingUser, existingInvite] = await Promise.all([
      prisma.role.findFirst({
        where: { id: body.roleId, clinicId, isActive: true },
      }),
      prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true },
      }),
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.employeeInvite.findFirst({
        where: { clinicId, email, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
        select: { id: true },
      }),
    ]);

    if (!role || role.key === "owner" || role.key === "superadmin") {
      return NextResponse.json({ error: "Rol invalido" }, { status: 400 });
    }

    if (existingUser || existingInvite) {
      return NextResponse.json(
        { error: "Ya existe un usuario o una invitación asociada a este correo." },
        { status: 409 }
      );
    }

    let user = null;

    let tempPassword: string | null = null;

    if (!user) {
      user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email,
            emailVerified: false,
            id: crypto.randomBytes(16).toString("hex"),
            name: body.name,
            role: null,
            mustChangePassword: true,
          },
        });

        tempPassword = await setTemporaryPasswordForUser(tx, createdUser.id);

        return createdUser;
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "No se pudo crear el usuario" },
        { status: 500 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);

    await prisma.$transaction(async (tx) => {
      await tx.clinicMember.upsert({
        where: {
          clinicId_userId: {
            clinicId,
            userId: user.id,
          },
        },
        update: {
          roleId: role.id,
          isActive: false,
        },
        create: {
          clinicId,
          userId: user.id,
          roleId: role.id,
          isActive: false,
        },
      });

      await tx.employeeInvite.create({
        data: {
          clinicId,
          createdById: session.user.id,
          email,
          expiresAt,
          roleId: role.id,
          tokenHash,
          userId: user.id,
        },
      });
    });

    const inviteUrl = `${getAppBaseUrl()}/accept-invite?token=${token}`;

    await sendEmployeeInviteEmail({
      clinicName: clinic?.name ?? "tu clinica",
      employeeName: user.name ?? body.name,
      expiresAt,
      inviteUrl,
      invitedByName: session.user.name ?? null,
      roleName: role.name,
      tempPassword,
      to: email,
    });

    return NextResponse.json({ inviteUrl, tempPassword });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { details: error.flatten(), error: "Datos invalidos" },
        { status: 422 }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { details: message, error: "No se pudo enviar la invitacion" },
      { status: 500 }
    );
  }
}
