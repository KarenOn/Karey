import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";

export async function GET(req: Request) {
  const clinicId = await getClinicIdOrFail();
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").toLocaleLowerCase().trim();

  if (!code) return NextResponse.json({ error: "code requerido" }, { status: 400 });

  // intenta SKU exacto
  const product = await prisma.product.findFirst({
    where: { clinicId, isActive: true, sku: { equals: code } },
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      trackStock: true,
      stockOnHand: true,
      category: true,
      requiresPrescription: true,
      description: true,
    },
  });

  if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(product);
}
