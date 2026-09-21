import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { getAppUrl, sendAppWelcomeEmail } from "@/lib/email";
import { deleteStoredFile, isS3StorageRef, resolveStoredFileUrl } from "@/lib/storage";
import { ClinicProfileSchema } from "@/lib/validators/clinic-profile";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function defaultSchedule() {
  return {
    monday: { open: "08:00", close: "18:00", closed: false },
    tuesday: { open: "08:00", close: "18:00", closed: false },
    wednesday: { open: "08:00", close: "18:00", closed: false },
    thursday: { open: "08:00", close: "18:00", closed: false },
    friday: { open: "08:00", close: "18:00", closed: false },
    saturday: { open: "09:00", close: "13:00", closed: false },
    sunday: { open: "09:00", close: "13:00", closed: true },
  } as Record<(typeof DAYS)[number], { open: string; close: string; closed: boolean }>;
}

function isClinicSetupRequired(profile: {
  name?: string | null;
  owner?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
}) {
  const hasName = !!profile.name?.trim();
  const hasOwner = !!profile.owner?.trim();
  const hasContact = !!profile.email?.trim() || !!profile.phone?.trim() || !!profile.mobile?.trim();

  return !hasName || !hasOwner || !hasContact;
}

async function readProfile(clinicId: number) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      currency: true,
      timezone: true,
      inventoryExpiryAlertDays: true,
      cashEntitled: true,
      cashEnabled: true,
      requireCashSessionForCash: true,
      logoUrl: true,
      slogan: true,
      owner: true,
      mobile: true,
      website: true,
      taxName: true,
      taxId: true,
      bankName: true,
      bankAccount: true,
      bankClabe: true,
      invoiceNotes: true,
      invoiceTerms: true,
      socialMedia: true,
    },
  });

  if (!clinic) {
    throw new Error("Clinic not found");
  }

  const schedRows = await prisma.clinicSchedule.findMany({
    where: { clinicId },
    select: { day: true, open: true, close: true, closed: true },
  });

  const base = defaultSchedule();
  const schedule = { ...base };

  for (const r of schedRows) {
    const day = r.day as keyof typeof schedule;
    schedule[day] = {
      open: r.open ?? base[day].open,
      close: r.close ?? base[day].close,
      closed: r.closed,
    };
  }

  const sm = (clinic.socialMedia ?? {}) as Record<string, string>;

  return {
    ...clinic,
    logoStorageRef: clinic.logoUrl ?? null,
    logoUrl: await resolveStoredFileUrl(clinic.logoUrl, {
      fileName: `logo-clinica-${clinic.id}.png`,
    }),
    socialMedia: {
      facebook: sm.facebook ?? "",
      instagram: sm.instagram ?? "",
      whatsapp: sm.whatsapp ?? "",
    },
    schedule,
  };
}

export async function GET() {
  try {
    const { clinicId } = await requireClinicPermission("clinic.read");
    const profile = await readProfile(clinicId);
    return NextResponse.json(profile);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);

  const parsed = ClinicProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const { schedule, socialMedia, logoStorageRef, ...clinicData } = data as any;

  try {
    const { clinicId, session } = await requireClinicPermission("clinic.update");
    const previousProfile = await readProfile(clinicId);

    await prisma.$transaction(async (tx) => {
      if (clinicData.cashEnabled === true) {
        const entitlement = await tx.clinic.findUnique({ where: { id: clinicId }, select: { cashEntitled: true } });
        if (!entitlement?.cashEntitled) throw new Error("CASH_NOT_ENTITLED");
      }
      if (clinicData.cashEnabled === false) {
        const open = await tx.cashSession.count({ where: { clinicId, status: "OPEN" } });
        if (open > 0) throw new Error("CASH_OPEN_SESSIONS");
      }
      await tx.clinic.update({
        where: { id: clinicId },
        data: {
          ...clinicData,
          ...(logoStorageRef !== undefined ? { logoUrl: logoStorageRef } : {}),
          ...(socialMedia ? { socialMedia: { ...socialMedia } } : {}),
        },
      });
      if (clinicData.cashEnabled === true) {
        const register = await tx.cashRegister.findFirst({ where: { clinicId }, select: { id: true } });
        if (!register) await tx.cashRegister.create({ data: { clinicId, name: "Caja principal" } });
      }

      if (schedule) {
        const entries = Object.entries(schedule) as Array<
          [string, { open?: string; close?: string; closed: boolean }]
        >;

        for (const [day, v] of entries) {
          await tx.clinicSchedule.upsert({
            where: { clinicId_day: { clinicId, day: day as any } },
            create: {
              clinicId,
              day: day as any,
              open: v.closed ? null : (v.open ?? null),
              close: v.closed ? null : (v.close ?? null),
              closed: v.closed,
            },
            update: {
              open: v.closed ? null : (v.open ?? null),
              close: v.closed ? null : (v.close ?? null),
              closed: v.closed,
            },
          });
        }
      }
    });

    const profile = await readProfile(clinicId);
    if (
      previousProfile.logoStorageRef &&
      previousProfile.logoStorageRef !== profile.logoStorageRef &&
      isS3StorageRef(previousProfile.logoStorageRef)
    ) {
      await deleteStoredFile(previousProfile.logoStorageRef).catch(() => undefined);
    }
    let emailWarning: string | null = null;

    if (
      session.user.email &&
      isClinicSetupRequired(previousProfile) &&
      !isClinicSetupRequired(profile)
    ) {
      try {
        await sendAppWelcomeEmail({
          clinicName: profile.name,
          loginUrl: getAppUrl("/"),
          to: session.user.email,
          userName: session.user.name,
          variant: "clinic_ready",
        });
      } catch (emailError) {
        emailWarning =
          emailError instanceof Error
            ? `La clínica se guardó, pero no se pudo enviar el correo de bienvenida: ${emailError.message}`
            : "La clínica se guardó, pero no se pudo enviar el correo de bienvenida.";
      }
    }

    return NextResponse.json(emailWarning ? { ...profile, emailWarning } : profile);
  } catch (e: any) {
    if (e?.message === "CASH_NOT_ENTITLED") return NextResponse.json({ error: "Esta clínica no tiene Caja Premium habilitada." }, { status: 403 });
    if (e?.message === "CASH_OPEN_SESSIONS") return NextResponse.json({ error: "Hay sesiones de caja abiertas. Debes cerrarlas antes de desactivar el control de caja." }, { status: 409 });
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
