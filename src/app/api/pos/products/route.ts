import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";

export async function GET(req: Request) {
  const clinicId = await getClinicIdOrFail();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  const products = await prisma.product.findMany({
    where: {
      clinicId,
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      trackStock: true,
      stockOnHand: true,
      minStock: true,
      category: true,
      requiresPrescription: true,
      description: true,
    },
    take: 300,
  });

  return NextResponse.json(products);
}
