import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clinic = await prisma.clinic.findFirst({ select: { id: true } });

  if (!clinic) return NextResponse.json([]);

  const clients = await prisma.client.findMany({
    where: { clinicId: clinic.id },
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
  const clinic = await prisma.clinic.findFirst({ select: { id: true } });
  if (!clinic) return NextResponse.json({ error: "No clinic found" }, { status: 400 });

  const body = await req.json();
  const client = await prisma.client.create({
    data: {
      clinicId: clinic.id,
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
