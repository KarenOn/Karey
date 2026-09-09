import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { ProductCreateSchema } from "@/lib/validators/product";
import { parse } from "date-fns";
import { syncInventoryNotifications } from "@/lib/in-app-notifications";

function zodDetails(err: z.ZodError) {
  const flat = err.flatten();
  return { formErrors: flat.formErrors, fieldErrors: flat.fieldErrors };
}

export async function GET(req: Request) {
  const { clinicId } = await requireClinicPermission("inventory.read");
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim();

  const where: Record<string, unknown> = { clinicId };

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
      expirationDate: true,
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
  const { clinicId } = await requireClinicPermission("inventory.create");
  const body = await req.json().catch(() => null);
  const parsed = ProductCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const input = parsed.data;

  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
      clinicId,
      name: input.name,
      sku: input.sku ?? null,
      category: input.category ?? null,
      unit: input.unit ?? "unidad",
      cost: input.cost ?? null,
      price: input.price!,
      trackStock: input.trackStock,
      stockOnHand: input.stockOnHand,
      minStock: input.minStock,
      expirationDate: input.expirationDate ? parse(input.expirationDate, "yyyy-MM-dd", new Date()) : null,
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
      expirationDate: true,
      isActive: true,
      description: true,
      requiresPrescription: true,
      createdAt: true,
      updatedAt: true,
    },
    });

    if (input.category?.trim().toLocaleLowerCase() === "vacuna") {
      const existingCatalog = await tx.vaccineCatalog.findFirst({
        where: { clinicId, name: input.name },
        select: { id: true, productId: true },
      });
      if (existingCatalog && !existingCatalog.productId) {
        await tx.vaccineCatalog.update({ where: { id: existingCatalog.id }, data: { productId: product.id, isActive: product.isActive } });
      } else if (!existingCatalog) {
        await tx.vaccineCatalog.create({ data: { clinicId, productId: product.id, name: product.name, isActive: product.isActive } });
      }
    }

    return product;
  });

  await syncInventoryNotifications(clinicId);

  return NextResponse.json(created, { status: 201 });
}
