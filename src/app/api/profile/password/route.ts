import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UserPasswordChangeSchema } from "@/lib/validators/profile";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = UserPasswordChangeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: parsed.data.revokeOtherSessions,
      },
      headers: await headers(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cambiar la contraseña";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
