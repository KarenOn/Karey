import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({ isActive: z.coerce.boolean() });
type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const clinicId = await getClinicIdOrFail();
  const id = Number((await params).id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });

  const up = await prisma.service.updateMany({
    where: { id, clinicId },
    data: { isActive: parsed.data.isActive },
  });

  if (up.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
