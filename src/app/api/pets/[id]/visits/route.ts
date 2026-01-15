import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ClinicalVisitCreateSchema } from "@/lib/validators/visits";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const petId = Number((await params).id);
  if (!Number.isFinite(petId)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

  const visits = await prisma.clinicalVisit.findMany({
    where: { petId },
    orderBy: { visitAt: "desc" },
    include: {
      attachments: true,
    },
  });

  return NextResponse.json(visits);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const petId = Number((await params).id);
  if (!Number.isFinite(petId)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = ClinicalVisitCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validación fallida", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet) return NextResponse.json({ message: "Mascota no encontrada" }, { status: 404 });

  const data = parsed.data;

  // Si no envían visitAt, Prisma usa default(now())
  const visit = await prisma.clinicalVisit.create({
    data: {
      clinicId: pet.clinicId,
      clientId: pet.clientId,
      petId: petId,

      visitAt: data.visitAt,
      weightKg: data.weightKg,
      temperatureC: data.temperatureC,

      diagnosis: data.diagnosis || null,
      treatment: data.treatment || null,
      notes: data.notes || null,

      vetId: data.vetId ? data.vetId : null,
    },
  });

  return NextResponse.json(visit, { status: 201 });
}
