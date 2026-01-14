import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PetUpdateSchema } from "@/lib/validators/pet";

async function getClinicIdFromRequest(_req: Request) {
  console.log("Getting clinic ID from request", _req);
  return 1; // TODO: reemplazar por tu session.clinicId
}

function parseId(id: string) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  console.log("Fetching pet with ID:", await params);
  const id = Number((await params).id);
  if (!Number.isFinite(id)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!pet) return NextResponse.json({ message: "Mascota no encontrada" }, { status: 404 });
  return NextResponse.json(pet);
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ message: "Invalid id" }, { status: 400 });

  const clinicId = await getClinicIdFromRequest(req);

  const body = await req.json().catch(() => null);
  const parsed = PetUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validación fallida", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // ✅ importante: asegurar que pertenece a la clínica (multi-tenant)
  const exists = await prisma.pet.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ message: "Pet not found" }, { status: 404 });

  const updated = await prisma.pet.update({
    where: { id },
    data: parsed.data,
    include: { client: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ message: "Invalid id" }, { status: 400 });

  const clinicId = await getClinicIdFromRequest(req);

  const exists = await prisma.pet.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ message: "Pet not found" }, { status: 404 });

  await prisma.pet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}