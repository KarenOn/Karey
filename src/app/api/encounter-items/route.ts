import { NextResponse } from "next/server";
import { z } from "zod";
import { InvoiceItemType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";

const LinkSchema = z.object({
  appointmentId: z.number().int().positive().nullable().optional(),
  todayTurnId: z.number().int().positive().nullable().optional(),
}).refine((value) => Boolean(value.appointmentId) !== Boolean(value.todayTurnId), "Indica una cita o un turno.");

const CreateSchema = LinkSchema.extend({
  type: z.nativeEnum(InvoiceItemType),
  serviceId: z.number().int().positive().nullable().optional(),
  productId: z.number().int().positive().nullable().optional(),
  description: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
});

async function resolveOwner(link: z.infer<typeof LinkSchema>, clinicId: number) {
  if (link.appointmentId) {
    return prisma.appointment.findFirst({ where: { id: link.appointmentId, clinicId }, select: { clientId: true, petId: true } });
  }
  return prisma.todayTurn.findFirst({ where: { id: link.todayTurnId!, clinicId }, select: { clientId: true, petId: true } });
}

export async function GET(req: Request) {
  const { clinicId } = await requireClinicPermission("pets.read");
  const parsed = LinkSchema.safeParse({
    appointmentId: req.url ? Number(new URL(req.url).searchParams.get("appointmentId")) || null : null,
    todayTurnId: req.url ? Number(new URL(req.url).searchParams.get("todayTurnId")) || null : null,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  const items = await prisma.encounterItem.findMany({
    where: { clinicId, ...parsed.data },
    orderBy: { createdAt: "asc" },
    select: { id: true, type: true, serviceId: true, productId: true, description: true, quantity: true, unitPrice: true },
  });
  return NextResponse.json(items.map((item) => ({ ...item, quantity: item.quantity.toString(), unitPrice: item.unitPrice.toString() })));
}

export async function POST(req: Request) {
  const { clinicId } = await requireClinicPermission("pets.update");
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  const owner = await resolveOwner(parsed.data, clinicId);
  if (!owner?.clientId || !owner.petId) return NextResponse.json({ error: "La atención necesita un cliente y paciente registrados." }, { status: 409 });
  if (parsed.data.type === InvoiceItemType.SERVICE && !parsed.data.serviceId) return NextResponse.json({ error: "Selecciona un servicio." }, { status: 422 });
  if (parsed.data.type === InvoiceItemType.PRODUCT && !parsed.data.productId) return NextResponse.json({ error: "Selecciona un producto." }, { status: 422 });
  const created = await prisma.encounterItem.create({ data: { clinicId, clientId: owner.clientId, petId: owner.petId, appointmentId: parsed.data.appointmentId ?? null, todayTurnId: parsed.data.todayTurnId ?? null, type: parsed.data.type, serviceId: parsed.data.serviceId ?? null, productId: parsed.data.productId ?? null, description: parsed.data.description, quantity: parsed.data.quantity, unitPrice: parsed.data.unitPrice }, select: { id: true, type: true, serviceId: true, productId: true, description: true, quantity: true, unitPrice: true } });
  return NextResponse.json({ ...created, quantity: created.quantity.toString(), unitPrice: created.unitPrice.toString() }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { clinicId } = await requireClinicPermission("pets.update");
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "ID inválido" }, { status: 422 });
  const deleted = await prisma.encounterItem.deleteMany({ where: { id, clinicId } });
  if (!deleted.count) return NextResponse.json({ error: "Consumo no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
