import { NextResponse } from "next/server";
import { readCurrentUserProfile, updateCurrentUserProfile } from "@/lib/current-user-profile";
import { UserProfileUpdateSchema } from "@/lib/validators/profile";

export async function GET() {
  try {
    const profile = await readCurrentUserProfile();
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el perfil";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = UserProfileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const profile = await updateCurrentUserProfile(parsed.data);
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el perfil";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
