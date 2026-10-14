import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { syncInventoryNotifications } from "@/lib/in-app-notifications";
import { consumeProductStockFEFO, InventoryStockError } from "@/lib/server/inventory-batches";
import { parse } from "date-fns";
import {
  StockMovementCreateSchema,
  stockMovementTypes,
  type StockMovementCreateInput,
} from "@/lib/validators/stock-movement";

function zodDetails(err: z.ZodError) {
  const flat = err.flatten();
  return { formErrors: flat.formErrors, fieldErrors: flat.fieldErrors };
}

function parsePositiveInt(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getMovementDelta(input: Pick<StockMovementCreateInput, "type" | "quantity">) {
  if (input.type === "ADJUST") return input.quantity;
  if (input.type === "IN" || input.type === "PURCHASE") return input.quantity;
  return -Math.abs(input.quantity);
}

export async function GET(req: Request) {
  const { clinicId } = await requireClinicPermission("inventory.read");
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = (searchParams.get("type") ?? "").trim();
  const take = Math.min(parsePositiveInt(searchParams.get("take")) ?? 150, 300);
  const productId = parsePositiveInt(searchParams.get("productId"));

  const where: Record<string, unknown> = { clinicId };

  if (productId) where.productId = productId;

  if (type && stockMovementTypes.includes(type as (typeof stockMovementTypes)[number])) {
    where.type = type;
  }

  if (q) {
    where.OR = [
      { reason: { contains: q, mode: "insensitive" } },
      { referenceType: { contains: q, mode: "insensitive" } },
      { referenceId: { contains: q, mode: "insensitive" } },
      { product: { name: { contains: q, mode: "insensitive" } } },
      { product: { sku: { contains: q, mode: "insensitive" } } },
    ];
  }

  const rows = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      clinicId: true,
      productId: true,
      type: true,
      quantity: true,
      reason: true,
      referenceType: true,
      referenceId: true,
      invoiceId: true,
      createdById: true,
      createdAt: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          unit: true,
          trackStock: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { clinicId, session } = await requireClinicPermission("inventoryMovements.create");
  const body = await req.json().catch(() => null);
  const parsed = StockMovementCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const input = parsed.data;
  const createdById = session.user.id;

  const delta = getMovementDelta(input);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: input.productId, clinicId }, select: { id: true, stockOnHand: true, trackStock: true } });
      if (!product) throw new InventoryStockError("Producto no encontrado");
      if (!product.trackStock) throw new InventoryStockError("Este producto no tiene control de stock activado");

      let allocations: Array<{ batchId: number | null; quantity: number }> = [];
      if (delta < 0) {
        allocations = await consumeProductStockFEFO(tx, { clinicId, productId: product.id, quantity: Math.abs(delta) });
      } else {
        const updated = await tx.product.updateMany({ where: { id: product.id }, data: { stockOnHand: { increment: delta } } });
        if (!updated.count) throw new InventoryStockError("No se pudo actualizar el stock");
        const batch = input.batchNumber ? await tx.productBatch.upsert({ where: { productId_lotNumber: { productId: product.id, lotNumber: input.batchNumber } }, create: { productId: product.id, lotNumber: input.batchNumber, expirationDate: input.expirationDate ? parse(input.expirationDate, "yyyy-MM-dd", new Date()) : null, quantity: delta }, update: { quantity: { increment: delta }, ...(input.expirationDate ? { expirationDate: parse(input.expirationDate, "yyyy-MM-dd", new Date()) } : {}) } }) : null;
        allocations = [{ batchId: batch?.id ?? null, quantity: delta }];
      }

      const movements = await Promise.all(allocations.map((allocation) => tx.stockMovement.create({
      data: {
        clinicId,
        productId: product.id,
        batchId: allocation.batchId,
        type: input.type,
        quantity: allocation.quantity,
        reason: input.reason ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        createdById,
      },
      select: {
        id: true,
        clinicId: true,
        productId: true,
        type: true,
        quantity: true,
        reason: true,
        referenceType: true,
        referenceId: true,
        invoiceId: true,
        createdById: true,
        createdAt: true,
      batchId: true,
      batch: { select: { id: true, lotNumber: true, expirationDate: true } },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            unit: true,
            trackStock: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })));

      return { movement: movements[0], product: await tx.product.findUniqueOrThrow({ where: { id: product.id }, select: { id: true, stockOnHand: true } }) };
    });

    await syncInventoryNotifications(clinicId);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof InventoryStockError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
