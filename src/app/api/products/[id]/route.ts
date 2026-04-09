import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { ProductUpdateSchema } from "@/lib/validators/product";

function zodDetails(err: z.ZodError) {
  const flat = err.flatten();
  return { formErrors: flat.formErrors, fieldErrors: flat.fieldErrors };
}

function parseId(params: { id: string }) {
  const id = Number(params.id);
  return Number.isFinite(id) ? id : null;
}

async function findProductOrFail(id: number, clinicId: number) {
  return prisma.product.findFirst({
    where: { id, clinicId },
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
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("inventory.read");
  const id = parseId(await params);
  if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

  const row = await findProductOrFail(id, clinicId);
  if (!row) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  return NextResponse.json(row);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("inventory.update");
  const id = parseId(await params);
  if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = ProductUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const exists = await prisma.product.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const data = parsed.data;

  const updated = await prisma.product.update({
    where: { id: exists.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.sku !== undefined ? { sku: data.sku } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.unit !== undefined ? { unit: data.unit } : {}),
      ...(data.cost !== undefined ? { cost: data.cost } : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.trackStock !== undefined ? { trackStock: data.trackStock } : {}),
      ...(data.stockOnHand !== undefined ? { stockOnHand: data.stockOnHand } : {}),
      ...(data.minStock !== undefined ? { minStock: data.minStock } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.requiresPrescription !== undefined
        ? { requiresPrescription: data.requiresPrescription }
        : {}),
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

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("inventory.delete");
  const id = parseId(await params);
  if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

  const exists = await prisma.product.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  await prisma.product.delete({ where: { id: exists.id } });
  return NextResponse.json({ ok: true });
}
