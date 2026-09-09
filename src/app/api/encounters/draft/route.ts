import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission, requireClinicPermissions } from "@/lib/server-auth";
import { InvoiceStatus, Prisma } from "@/generated/prisma/client";
import { z } from "zod";

const LinkSchema = z.object({
  appointmentId: z.number().int().positive().nullable().optional(),
  todayTurnId: z.number().int().positive().nullable().optional(),
}).refine((value) => Boolean(value.appointmentId) !== Boolean(value.todayTurnId), "Indica una cita o un turno.");

export async function POST(req: Request) {
  const { clinicId } = await requireClinicPermission("encounters.manage");
  const parsed = LinkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });

  const link = parsed.data;
  const items = await prisma.encounterItem.findMany({
    where: { clinicId, ...link },
    orderBy: { createdAt: "asc" },
    select: { type: true, serviceId: true, productId: true, description: true, quantity: true, unitPrice: true },
  });
  if (items.length === 0) return NextResponse.json({ error: "Agrega al menos un consumo antes de enviar a facturación." }, { status: 422 });

  const owner = link.appointmentId
    ? await prisma.appointment.findFirst({ where: { id: link.appointmentId, clinicId }, select: { clientId: true, petId: true } })
    : await prisma.todayTurn.findFirst({ where: { id: link.todayTurnId!, clinicId }, select: { clientId: true, petId: true } });
  if (!owner?.clientId || !owner.petId) return NextResponse.json({ error: "La atención necesita un cliente y paciente registrados." }, { status: 409 });
  const resolvedClientId = owner.clientId;
  const resolvedPetId = owner.petId;

  const result = await prisma.$transaction(async (tx) => {
    const where = { clinicId, ...(link.appointmentId ? { appointmentId: link.appointmentId } : { todayTurnId: link.todayTurnId }) };
    const existing = await tx.invoice.findFirst({ where, select: { id: true, status: true } });
    if (existing && existing.status !== InvoiceStatus.DRAFT) {
      return { conflict: true as const };
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
    const invoiceItems = items.map((item) => ({
      type: item.type,
      serviceId: item.serviceId,
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: new Prisma.Decimal(0),
      lineTotal: new Prisma.Decimal((Number(item.quantity) * Number(item.unitPrice)).toFixed(2)),
    }));

    if (existing) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });
      const draft = await tx.invoice.update({
        where: { id: existing.id },
        data: {
          clientId: resolvedClientId,
          petId: resolvedPetId,
          status: InvoiceStatus.DRAFT,
          subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
          tax: new Prisma.Decimal(0),
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(subtotal.toFixed(2)),
          paidAt: null,
          items: { create: invoiceItems },
        },
        select: { id: true, status: true, number: true },
      });
      return { conflict: false as const, draft };
    }

    const draft = await tx.invoice.create({
      data: {
        clinicId,
        clientId: resolvedClientId,
        petId: resolvedPetId,
        appointmentId: link.appointmentId ?? null,
        todayTurnId: link.todayTurnId ?? null,
        number: `BORRADOR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        status: InvoiceStatus.DRAFT,
        subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
        tax: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(subtotal.toFixed(2)),
        items: { create: invoiceItems },
      },
      select: { id: true, status: true, number: true },
    });
    return { conflict: false as const, draft };
  });

  if (result.conflict) return NextResponse.json({ error: "La atención ya tiene una factura emitida." }, { status: 409 });
  return NextResponse.json(result.draft, { status: 201 });
}

export async function GET(req: Request) {
  const { clinicId } = await requireClinicPermissions(["pets.read", "visits.read"]);
  const params = new URL(req.url).searchParams;
  const parsed = LinkSchema.safeParse({
    appointmentId: Number(params.get("appointmentId")) || null,
    todayTurnId: Number(params.get("todayTurnId")) || null,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });

  const invoice = await prisma.invoice.findFirst({
    where: {
      clinicId,
      status: { not: InvoiceStatus.VOID },
      ...(parsed.data.appointmentId ? { appointmentId: parsed.data.appointmentId } : { todayTurnId: parsed.data.todayTurnId }),
    },
    select: { id: true, status: true },
  });
  return NextResponse.json(invoice ?? null);
}
