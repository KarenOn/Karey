import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clinicId = Number(searchParams.get("clinicId") ?? "1");

  const vaccines = await prisma.vaccineCatalog.findMany({
    where: { clinicId, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(vaccines);
}
