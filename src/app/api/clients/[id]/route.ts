import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { ClientFormSchema, zodFieldErrors } from "@/lib/validators/client";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("clients.update");
  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  const parsed = ClientFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "No pudimos actualizar el cliente. Revisa los datos e inténtalo nuevamente.", details: zodFieldErrors(parsed.error) },
      { status: 422 }
    );
  }

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
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
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
  const id = Number((await params).id);

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
