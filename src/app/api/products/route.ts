import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductCreateSchema } from "@/lib/validators/product";
import { z } from "zod";
import { getClinicIdOrFail } from "@/lib/auth"; // usa tu misma función

function zodDetails(err: z.ZodError) {
  const flat = err.flatten();
  return { formErrors: flat.formErrors, fieldErrors: flat.fieldErrors };
}

export async function GET(req: Request) {
  const clinicId = await getClinicIdOrFail();
  if (!clinicId) {
    return NextResponse.json({ error: "No existe clínica configurada" }, { status: 409 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim();

  const where: any = { clinicId };

  if (category) where.category = category;

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clinicId: true,
      sku: true,
      name: true,
      category: true,
      unit: true,
      cost: true,
      price: true,
      trackStock: true,
      stockOnHand: true,
      minStock: true,
      isActive: true,
      description: true,
      requiresPrescription: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const clinicId = await getClinicIdOrFail();
  if (!clinicId) {
    return NextResponse.json({ error: "No existe clínica configurada" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ProductCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const input = parsed.data;

  const created = await prisma.product.create({
    data: {
      clinicId,
      name: input.name,
      sku: input.sku ?? null,
      category: input.category ?? null,
      unit: input.unit ?? "unidad",
      cost: input.cost ?? null,
      price: input.price!, // ya validado
      trackStock: input.trackStock,
      stockOnHand: input.stockOnHand,
      minStock: input.minStock,
      isActive: input.isActive,
      description: input.description ?? null,
      requiresPrescription: input.requiresPrescription,
    },
    select: {
      id: true,
      clinicId: true,
      sku: true,
      name: true,
      category: true,
      unit: true,
      cost: true,
      price: true,
      trackStock: true,
      stockOnHand: true,
      minStock: true,
      isActive: true,
      description: true,
      requiresPrescription: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
