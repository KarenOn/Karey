import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
import { ServiceCreateSchema } from "@/lib/validators/service";
import { Prisma } from "@/generated/prisma/client";
import { zodDetails } from "@/lib/zodDetails";

export async function GET(req: Request) {
  const clinicId = await getClinicIdOrFail();
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const active = searchParams.get("active")?.trim(); // "true" | "false" | undefined
  const take = Math.min(Number(searchParams.get("take") || 300), 800);

  const where: Prisma.ServiceWhereInput = {
    clinicId,
    ...(category ? { category } : {}),
    ...(active === "true" ? { isActive: true } : {}),
    ...(active === "false" ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const rows = await prisma.service.findMany({
    where,
    take,
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      price: true,
      durationMins: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      price: r.price.toString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );
}

export async function POST(req: Request) {
  const clinicId = await getClinicIdOrFail();
  const body = await req.json().catch(() => null);

  const parsed = ServiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const data = parsed.data;

  const created = await prisma.service.create({
    data: {
      clinicId,
      name: data.name,
      category: data.category ?? null,
      description: data.description ?? null,
      price: new Prisma.Decimal(data.price),
      durationMins: data.durationMins ?? null,
      isActive: data.isActive ?? true,
    },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      price: true,
      durationMins: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    {
      ...created,
      price: created.price.toString(),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}
