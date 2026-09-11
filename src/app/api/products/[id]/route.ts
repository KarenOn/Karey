import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { ProductUpdateSchema } from "@/lib/validators/product";
import { parse } from "date-fns";
import { syncInventoryNotifications } from "@/lib/in-app-notifications";

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
      expirationDate: true,
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

  const updated = await prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
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
      ...(data.expirationDate !== undefined ? { expirationDate: data.expirationDate ? parse(data.expirationDate, "yyyy-MM-dd", new Date()) : null } : {}),
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
      expirationDate: true,
      isActive: true,
      description: true,
      requiresPrescription: true,
      createdAt: true,
      updatedAt: true,
    },
    });

    if (data.category?.trim().toLocaleLowerCase() === "vacuna") {
      const existingCatalog = await tx.vaccineCatalog.findFirst({
        where: { clinicId, name: product.name },
        select: { id: true, productId: true },
      });
      if (existingCatalog && !existingCatalog.productId) {
        await tx.vaccineCatalog.update({ where: { id: existingCatalog.id }, data: { productId: product.id, isActive: product.isActive } });
      } else if (!existingCatalog) {
        await tx.vaccineCatalog.create({ data: { clinicId, productId: product.id, name: product.name, isActive: product.isActive } });
      }
    }

    if (data.isActive !== undefined) {
      await tx.vaccineCatalog.updateMany({
        where: { clinicId, productId: product.id },
        data: { isActive: product.isActive },
      });
    }

    return product;
  });

  await syncInventoryNotifications(clinicId);

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("inventory.delete");
  const id = parseId(await params);
  if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

  const exists = await prisma.product.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.vaccineCatalog.updateMany({
      where: { clinicId, productId: exists.id },
      data: { isActive: false },
    });
    await tx.product.delete({ where: { id: exists.id } });
  });
  return NextResponse.json({ ok: true });
}
