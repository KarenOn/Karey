import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildInitialClinicName,
  createClinicWithOwner,
} from "@/lib/admin-clinics";
import { getFriendlyAuthMessage, getFriendlyWelcomeEmailWarning } from "@/lib/auth-feedback";
import { getAppUrl, sendAppWelcomeEmail } from "@/lib/email";

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(120),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Revisa los datos del formulario e inténtalo nuevamente.", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const fullName = parsed.data.fullName.trim();
    const email = parsed.data.email.trim().toLowerCase();

    const result = await createClinicWithOwner({
      clinicName: buildInitialClinicName(fullName),
      ownerName: fullName,
      ownerEmail: email,
      ownerPassword: parsed.data.password,
      emailVerified: false,
    });

    let emailWarning: string | null = null;

    try {
      await sendAppWelcomeEmail({
        clinicName: result.clinic.name,
        loginUrl: getAppUrl("/today"),
        to: email,
        userName: fullName,
        variant: "signup",
      });
    } catch {
      emailWarning = getFriendlyWelcomeEmailWarning();
    }

    return NextResponse.json(
      emailWarning
        ? { ok: true, clinicId: result.clinic.id, emailWarning }
        : { ok: true, clinicId: result.clinic.id },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : null;
    const status = message === "OWNER_EMAIL_ALREADY_EXISTS" ? 409 : 500;
    const errorMessage = getFriendlyAuthMessage(message, "register");

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
