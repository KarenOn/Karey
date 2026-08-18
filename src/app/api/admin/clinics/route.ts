import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClinic, listAdminClinics } from "@/lib/admin-clinics";
import { getAppUrl, sendClinicWelcomeEmail } from "@/lib/email";
import { requireSuperAdmin } from "@/lib/server-auth";

const createClinicSchema = z.object({
  clinicName: z.string().trim().min(2).max(160),
  clinicEmail: z.string().trim().email().or(z.literal("")).optional(),
  clinicPhone: z.string().trim().max(40).or(z.literal("")).optional(),
  plan: z.string().trim().max(80).or(z.literal("")).optional(),
  isActive: z.boolean().optional(),
  subscriptionStatus: z.enum(["active", "inactive", "past_due"]).optional(),
  subscriptionEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .optional(),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email(),
  ownerPhone: z.string().trim().max(40).or(z.literal("")).optional(),
  ownerPassword: z.string().min(8).max(120).or(z.literal("")).optional(),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const clinics = await listAdminClinics();
    return NextResponse.json({ clinics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar las clinicas";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();

    const body = await req.json().catch(() => null);
    const parsed = createClinicSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const result = await createAdminClinic(parsed.data);

    let emailWarning: string | null = null;

    try {
      await sendClinicWelcomeEmail({
        clinicName: result.clinic.name,
        loginUrl: getAppUrl("/login"),
        ownerEmail: result.ownerAccess.email,
        ownerName: parsed.data.ownerName,
        plan: parsed.data.plan,
        subscriptionEndDate: parsed.data.subscriptionEndDate
          ? new Date(`${parsed.data.subscriptionEndDate}T00:00:00.000Z`)
          : null,
        tempPassword: result.ownerAccess.password,
        to: result.ownerAccess.email,
      });
    } catch (emailError) {
      emailWarning =
        emailError instanceof Error
          ? `La clínica se creó, pero no se pudo enviar el correo: ${emailError.message}`
          : "La clínica se creó, pero no se pudo enviar el correo de bienvenida.";
    }

    return NextResponse.json(
      emailWarning ? { ...result, emailWarning } : result,
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la clínica";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : message === "OWNER_EMAIL_ALREADY_EXISTS"
            ? 409
            : 500;

    const errorMessage =
      message === "OWNER_EMAIL_ALREADY_EXISTS"
        ? "Ya existe un usuario con ese correo. Usa otro email para el owner inicial."
        : message;

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
