import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";

export async function GET(req: Request) {
  const clinicId = await getClinicIdOrFail();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  const services = await prisma.service.findMany({
    where: {
      clinicId,
      isActive: true,
      ...(q
        ? { name: { contains: q, mode: "insensitive" } }
        : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true, durationMins: true },
    take: 200,
  });

  return NextResponse.json(services);
}
