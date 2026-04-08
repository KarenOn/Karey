import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getClinicIdOrFail } from "@/lib/auth";

const UnsubSchema = z.object({ endpoint: z.string().url() });

export async function POST(req: Request) {
  const clinicId = await getClinicIdOrFail();

  const body = await req.json().catch(() => null);
  const parsed = UnsubSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { clinicId, endpoint: parsed.data.endpoint },
  });

  return NextResponse.json({ ok: true });
}
