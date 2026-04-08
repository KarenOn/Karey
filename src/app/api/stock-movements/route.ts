import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, getClinicIdOrFail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

async function getCurrentUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user?.id ?? null;
}

export async function GET(req: Request) {
  const clinicId = await getClinicIdOrFail();
  if (!clinicId) {
    return NextResponse.json(
      { error: "No existe clinica configurada" },
      { status: 409 }
    );
  }

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
  const clinicId = await getClinicIdOrFail();
  if (!clinicId) {
    return NextResponse.json(
      { error: "No existe clinica configurada" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = StockMovementCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const input = parsed.data;
  const createdById = await getCurrentUserId();

  const product = await prisma.product.findFirst({
    where: { id: input.productId, clinicId },
    select: {
      id: true,
      stockOnHand: true,
      trackStock: true,
    },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  if (!product.trackStock) {
    return NextResponse.json(
      { error: "Este producto no tiene control de stock activado" },
      { status: 409 }
    );
  }

  const delta = getMovementDelta(input);
  const nextStock = product.stockOnHand + delta;

  if (nextStock < 0) {
    return NextResponse.json(
      { error: "El movimiento deja el stock en negativo" },
      { status: 409 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { stockOnHand: nextStock },
      select: { id: true, stockOnHand: true },
    });

    const movement = await tx.stockMovement.create({
      data: {
        clinicId,
        productId: product.id,
        type: input.type,
        quantity: input.quantity,
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

    return { movement, product: updatedProduct };
  });

  return NextResponse.json(result, { status: 201 });
}
