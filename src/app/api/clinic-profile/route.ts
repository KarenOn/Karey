import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { resolveStoredFileUrl } from "@/lib/storage";
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
    const { clinicId } = await requireClinicPermission("clinic.update");
    await prisma.$transaction(async (tx) => {
      await tx.clinic.update({
        where: { id: clinicId },
        data: {
          ...clinicData,
          ...(logoStorageRef !== undefined ? { logoUrl: logoStorageRef } : {}),
          ...(socialMedia ? { socialMedia: { ...socialMedia } } : {}),
        },
      });

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
    return NextResponse.json(profile);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
