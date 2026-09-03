import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { ClientFormSchema, zodFieldErrors } from "@/lib/validators/client";

export async function GET() {
  const { clinicId } = await requireClinicPermission("clients.read");

  const clients = await prisma.client.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { pets: true } } },
  });

  return NextResponse.json(
    clients.map((client) => ({
      id: client.id,
      fullName: client.fullName,
      phone: client.phone,
      email: client.email,
      address: client.address,
      notes: client.notes,
      petsCount: client._count.pets,
    }))
  );
}

export async function POST(req: Request) {
  const { clinicId } = await requireClinicPermission("clients.create");
  const body = await req.json().catch(() => null);
  const parsed = ClientFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "No pudimos crear el cliente. Revisa los datos e inténtalo nuevamente.", details: zodFieldErrors(parsed.error) },
      { status: 422 }
    );
  }

  const client = await prisma.client.create({
    data: {
      clinicId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json(
    {
      id: client.id,
      fullName: client.fullName,
      phone: client.phone,
      email: client.email,
      address: client.address,
      notes: client.notes,
      petsCount: 0,
    },
    { status: 201 }
  );
}
