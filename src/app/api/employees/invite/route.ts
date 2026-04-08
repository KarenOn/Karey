import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireClinicPermission } from "@/lib/server-auth";

const InviteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  roleId: z.number().int(),
});

export async function POST(req: Request) {
  try {
    const { session, clinicId } = await requireClinicPermission("employees.invite");
    const body = InviteSchema.parse(await req.json());

    const email = body.email.toLowerCase();

    const role = await prisma.role.findFirst({
      where: { id: body.roleId, clinicId, isActive: true },
    });
    if (!role) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const existingMember = await prisma.clinicMember.findFirst({
        where: { clinicId, userId: user.id },
        select: { id: true },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "Ese usuario ya pertenece a la clínica. Puedes editar su rol desde la lista de miembros." },
          { status: 400 }
        );
      }
    }

    let tempPassword: string | null = null;

    if (!user) {
      tempPassword = crypto.randomBytes(10).toString("hex");

      await auth.api.createUser({
        body: {
          email,
          password: tempPassword,
          name: body.name,
          role: "user",
        },
        headers: await headers(),
      });

      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 500 });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);

    const existingInvite = await prisma.employeeInvite.findFirst({
      where: { clinicId, email, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (existingInvite) {
      await prisma.employeeInvite.update({
        where: { id: existingInvite.id },
        data: {
          roleId: role.id,
          userId: user.id,
          tokenHash,
          expiresAt,
          createdById: session.user.id,
        },
      });
    } else {
      await prisma.employeeInvite.create({
        data: {
          clinicId,
          email,
          roleId: role.id,
          userId: user.id,
          tokenHash,
          expiresAt,
          createdById: session.user.id,
        },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;

    return NextResponse.json({ inviteUrl, tempPassword });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: "Datos inválidos", details: message }, { status: 422 });
  }
}
