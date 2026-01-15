import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
import { ServiceUpdateSchema } from "@/lib/validators/service";
import { Prisma } from "@/generated/prisma/client";
import { zodDetails } from "@/lib/zodDetails";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const clinicId = await getClinicIdOrFail();
  const id = Number((await params).id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const row = await prisma.service.findFirst({
    where: { id, clinicId },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      price: true,
      durationMins: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({
    ...row,
    price: row.price.toString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function PUT(req: Request, { params }: Params) {
  const clinicId = await getClinicIdOrFail();
  const id = Number((await params).id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = ServiceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: zodDetails(parsed.error) }, { status: 422 });
  }

  const data = parsed.data;

  const updated = await prisma.service.updateMany({
    where: { id, clinicId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category ?? null } : {}),
      ...(data.description !== undefined ? { description: data.description ?? null } : {}),
      ...(data.price !== undefined ? { price: new Prisma.Decimal(data.price) } : {}),
      ...(data.durationMins !== undefined ? { durationMins: data.durationMins ?? null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });

  if (updated.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const row = await prisma.service.findFirst({ where: { id, clinicId } });
  return NextResponse.json({
    ...row!,
    price: row!.price.toString(),
    createdAt: row!.createdAt.toISOString(),
    updatedAt: row!.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const clinicId = await getClinicIdOrFail();
  const id = Number((await params).id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const del = await prisma.service.deleteMany({ where: { id, clinicId } });
  if (del.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
