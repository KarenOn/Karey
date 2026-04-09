import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { PetUpdateSchema } from "@/lib/validators/pet";

function parseId(id: string) {
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("pets.read");
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

  const pet = await prisma.pet.findFirst({
    where: { id, clinicId },
    include: { client: true },
  });

  if (!pet) return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
  return NextResponse.json(pet);
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("pets.update");
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PetUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validacion fallida", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const exists = await prisma.pet.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });

  if (parsed.data.clientId !== undefined) {
    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, clinicId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente invalido" }, { status: 404 });
    }
  }

  const updated = await prisma.pet.update({
    where: { id: exists.id },
    data: parsed.data,
    include: { client: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("pets.delete");
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

  const exists = await prisma.pet.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });

  await prisma.pet.delete({ where: { id: exists.id } });
  return NextResponse.json({ ok: true });
}
