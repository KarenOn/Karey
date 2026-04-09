import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("clients.update");
  const paramsExtracted = await params;
  const id = Number(paramsExtracted.id);
  const body = await req.json();

  const existing = await prisma.client.findFirst({
    where: { id, clinicId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const updated = await prisma.client.update({
    where: { id: existing.id },
    data: {
      fullName: String(body.fullName ?? "").trim(),
      phone: body.phone ? String(body.phone).trim() : null,
      email: body.email ? String(body.email).trim() : null,
      address: body.address ? String(body.address).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
    },
  });

  const petsCount = await prisma.pet.count({ where: { clientId: updated.id } });

  return NextResponse.json({
    id: updated.id,
    fullName: updated.fullName,
    phone: updated.phone,
    email: updated.email,
    address: updated.address,
    notes: updated.notes,
    petsCount,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("clients.delete");
  const paramsExtracted = await params;
  const id = Number(paramsExtracted.id);

  const existing = await prisma.client.findFirst({
    where: { id, clinicId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  await prisma.client.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
