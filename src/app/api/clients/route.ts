import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";

export async function GET() {
  const { clinicId } = await requireClinicPermission("clients.read");

  const clients = await prisma.client.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { pets: true } } },
  });

  return NextResponse.json(
    clients.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      email: c.email,
      address: c.address,
      notes: c.notes,
      petsCount: c._count.pets,
    }))
  );
}

export async function POST(req: Request) {
  const { clinicId } = await requireClinicPermission("clients.create");

  const body = await req.json();
  const client = await prisma.client.create({
    data: {
      clinicId,
      fullName: String(body.fullName ?? "").trim(),
      phone: body.phone ? String(body.phone).trim() : null,
      email: body.email ? String(body.email).trim() : null,
      address: body.address ? String(body.address).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
    },
  });

  return NextResponse.json({
    id: client.id,
    fullName: client.fullName,
    phone: client.phone,
    email: client.email,
    address: client.address,
    notes: client.notes,
    petsCount: 0,
  });
}
