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
      { error: "Token invalido." },
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
            ? "El enlace de confirmacion ya no es valido o expiro."
            : message === "TOKEN_REQUERIDO"
              ? "Falta el token de confirmacion."
              : message === "CITA_NO_ENCONTRADA"
                ? "No encontramos la cita que intentas confirmar."
                : "Esta cita ya no se puede confirmar desde este enlace.",
      },
      { status }
    );
  }
}
