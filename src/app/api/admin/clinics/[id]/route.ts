import { NextResponse } from "next/server";
import { z } from "zod";
import { SubscriptionStatus } from "@/generated/prisma/client";
import { getAdminClinicById, normalizeAdminPhone, toPrismaSubscriptionStatus } from "@/lib/admin-clinics";
import { getAppUrl, sendClinicWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/server-auth";
import { setTemporaryPasswordForUser } from "@/lib/temporary-password";
import { markSubscriptionPaid } from "@/lib/subscription-lifecycle";

const updateClinicSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark_paid") }),
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("deactivate") }),
  z.object({
    action: z.literal("update"),
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().email().or(z.literal("")).optional(),
    phone: z.string().trim().max(40).or(z.literal("")).optional(),
    plan: z.string().trim().max(80).or(z.literal("")).optional(),
    isActive: z.boolean().optional(),
    subscriptionStatus: z.enum(["active", "inactive", "past_due"]).optional(),
    subscriptionEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .or(z.literal(""))
      .optional(),
    subscriptionReminderDays: z.number().int().min(0).max(30).optional(),
    subscriptionGraceDays: z.number().int().min(0).max(30).optional(),
  }),
]);

function toNullishString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toDateOnly(value?: string) {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await context.params;
    const clinicId = Number(id);

    if (!Number.isInteger(clinicId) || clinicId <= 0) {
      return NextResponse.json({ error: "Clinica invalida" }, { status: 400 });
    }

    const clinic = await getAdminClinicById(clinicId);
    if (!clinic) {
      return NextResponse.json({ error: "Clinica no encontrada" }, { status: 404 });
    }

    return NextResponse.json(clinic);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar la clinica";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();

    const { id } = await context.params;
    const clinicId = Number(id);
    if (!Number.isInteger(clinicId) || clinicId <= 0) {
      return NextResponse.json({ error: "Clinica invalida" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateClinicSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const current = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, isActive: true, subscriptionStatus: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Clinica no encontrada" }, { status: 404 });
    }

    if (parsed.data.action === "mark_paid") {
      await markSubscriptionPaid(clinicId);
      return NextResponse.json(await getAdminClinicById(clinicId));
    }

    if (parsed.data.action === "activate") {
      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          isActive: true,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        },
      });
    } else if (parsed.data.action === "deactivate") {
      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          isActive: false,
          subscriptionStatus: SubscriptionStatus.INACTIVE,
        },
      });
    } else {
      const nextIsActive = parsed.data.isActive ?? current.isActive;
      let nextSubscriptionStatus = parsed.data.subscriptionStatus
        ? toPrismaSubscriptionStatus(parsed.data.subscriptionStatus)
        : current.subscriptionStatus;

      if (!nextIsActive) {
        nextSubscriptionStatus = SubscriptionStatus.INACTIVE;
      } else if (nextSubscriptionStatus === SubscriptionStatus.INACTIVE) {
        nextSubscriptionStatus = SubscriptionStatus.ACTIVE;
      }

      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          name: parsed.data.name.trim(),
          email: toNullishString(parsed.data.email),
          phone: normalizeAdminPhone(parsed.data.phone),
          plan: toNullishString(parsed.data.plan),
          isActive: nextIsActive,
          subscriptionStatus: nextSubscriptionStatus,
          subscriptionEndDate:
            parsed.data.subscriptionEndDate === undefined
              ? undefined
              : toDateOnly(parsed.data.subscriptionEndDate),
          subscriptionReminderDays: parsed.data.subscriptionReminderDays,
          subscriptionGraceDays: parsed.data.subscriptionGraceDays,
        },
      });
    }

    const clinic = await getAdminClinicById(clinicId);
    return NextResponse.json(clinic);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la clinica";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "SUBSCRIPTION_ALREADY_PAID" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const clinicId = Number((await context.params).id);
    if (!Number.isInteger(clinicId) || clinicId <= 0) {
      return NextResponse.json({ error: "Clinica invalida" }, { status: 400 });
    }

    const owner = await prisma.clinicMember.findFirst({
      where: { clinicId, isActive: true, role: { is: { key: "owner", isActive: true } } },
      select: {
        user: { select: { id: true, name: true, email: true, mustChangePassword: true } },
        clinic: { select: { name: true, plan: true, subscriptionEndDate: true } },
      },
    });

    if (!owner) return NextResponse.json({ error: "Owner no encontrado" }, { status: 404 });
    if (!owner.user.mustChangePassword) {
      return NextResponse.json({ error: "El owner ya completó su acceso" }, { status: 409 });
    }

    const temporaryPassword = await prisma.$transaction((tx) =>
      setTemporaryPasswordForUser(tx, owner.user.id),
    );

    await sendClinicWelcomeEmail({
      clinicName: owner.clinic.name,
      loginUrl: getAppUrl("/login"),
      ownerEmail: owner.user.email,
      ownerName: owner.user.name,
      plan: owner.clinic.plan,
      subscriptionEndDate: owner.clinic.subscriptionEndDate,
      tempPassword: temporaryPassword,
      to: owner.user.email,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo reenviar la invitación";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? "No se pudo reenviar la invitación" : message }, { status });
  }
}
