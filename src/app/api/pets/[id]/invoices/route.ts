import { NextResponse } from "next/server";
import { InvoiceStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("invoices.read");
  const petId = Number((await params).id);
  if (!Number.isInteger(petId) || petId <= 0) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const rawPage = Number(searchParams.get("page") || 0);
  const rawPageSize = Number(searchParams.get("pageSize") || 10);
  const page = Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const pageSize = Number.isInteger(rawPageSize) ? Math.min(50, Math.max(1, rawPageSize)) : 10;
  const statusFilter = Object.values(InvoiceStatus).find((value) => value === status);
  const where: Prisma.InvoiceWhereInput = {
    clinicId,
    petId,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q ? { OR: [{ number: { contains: q } }, { client: { fullName: { contains: q } } }] } : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip: page * pageSize,
      take: pageSize,
      orderBy: { issueDate: "desc" },
      select: {
        id: true,
        number: true,
        status: true,
        issueDate: true,
        dueDate: true,
        paidAt: true,
        total: true,
        client: { select: { id: true, fullName: true } },
        pet: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
        payments: { select: { amount: true }, orderBy: { paidAt: "desc" } },
      },
    }),
  ]);

  const data = rows.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    total: invoice.total.toString(),
    paidTotal: invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0).toFixed(2),
    client: invoice.client,
    pet: invoice.pet,
    paymentsCount: invoice._count.payments,
  }));

  return NextResponse.json({ data, total, page, pageSize });
}
