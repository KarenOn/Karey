import { NextResponse } from "next/server";
import { PushSendSchema } from "@/lib/validators/push";
import { zodDetails } from "@/lib/zodDetails";
import { getClinicIdOrFail } from "@/lib/auth";
import { sendPushToClinic } from "@/lib/push";

export async function POST(req: Request) {
  const clinicId = await getClinicIdOrFail();

  const body = await req.json().catch(() => null);
  const parsed = PushSendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const results = await sendPushToClinic(clinicId, parsed.data);
  return NextResponse.json({ ok: true, resultsCount: results.length });
}
