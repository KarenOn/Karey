import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { ClientFormSchema, zodFieldErrors } from "@/lib/validators/client";

export async function GET(req: Request) {
  const { clinicId } = await requireClinicPermission("clients.read");
  const query = new URL(req.url).searchParams;
  const search = query.get("search")?.trim() ?? "";
  const hasSearchQuery = query.has("search") || query.has("limit");

  if (hasSearchQuery) {
    const limitValue = Number(query.get("limit") ?? 20);
    const take = Number.isInteger(limitValue) ? Math.min(Math.max(limitValue, 1), 50) : 20;
    if (search.length > 0 && search.length < 2) return NextResponse.json([]);

    const clients = await prisma.client.findMany({
      where: {
        clinicId,
        ...(search ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: { fullName: "asc" },
      take,
      select: { id: true, fullName: true, phone: true, email: true },
    });

    return NextResponse.json(clients);
  }

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

  const duplicate = await prisma.client.findFirst({
    where: {
      clinicId,
      OR: [
        { phone: parsed.data.phone },
        ...(parsed.data.email ? [{ email: parsed.data.email }] : []),
      ],
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Ya existe un cliente con ese teléfono o correo electrónico." }, { status: 409 });
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
