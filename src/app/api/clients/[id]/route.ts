import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const paramsExtracted = await params;
  const id = Number(paramsExtracted.id);
  const body = await req.json();

  const updated = await prisma.client.update({
    where: { id },
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
  const paramsExtracted = await params;
  const id = Number(paramsExtracted.id);
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
