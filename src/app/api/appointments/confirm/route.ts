import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmAppointmentFromToken } from "@/lib/reminders";

const BodySchema = z.object({
  token: z.string().trim().min(1),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Este enlace de confirmación no es válido." },
      { status: 422 }
    );
  }

  try {
    const result = await confirmAppointmentFromToken(parsed.data.token);
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERROR_DESCONOCIDO";
    const status =
      message === "TOKEN_INVALIDO" || message === "TOKEN_REQUERIDO"
        ? 400
        : message === "CITA_NO_ENCONTRADA"
          ? 404
          : 409;

    return NextResponse.json(
      {
        error:
          message === "TOKEN_INVALIDO"
            ? "Este enlace ya no está disponible o venció."
            : message === "TOKEN_REQUERIDO"
              ? "Necesitamos un enlace válido para confirmar la cita."
              : message === "CITA_NO_ENCONTRADA"
                ? "No encontramos la cita que intentas confirmar."
                : "Esta cita ya no puede confirmarse desde este enlace. Comunícate con la clínica si necesitas ayuda.",
      },
      { status }
    );
  }
}
