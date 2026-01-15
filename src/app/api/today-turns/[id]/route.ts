// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getClinicIdOrFail } from "@/lib/auth";
// import { TodayTurnUpdateSchema } from "@/lib/validators/today-turns";

// export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
//   const clinicId = await getClinicIdOrFail();
//   const { id } = await ctx.params;
//   const turnId = Number(id);
//   if (!Number.isFinite(turnId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

//   const body = await req.json().catch(() => null);
//   const parsed = TodayTurnUpdateSchema.safeParse(body);

//   if (!parsed.success) {
//     return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 422 });
//   }

//   const data = parsed.data;

//   const updated = await prisma.todayTurn.updateMany({
//     where: { id: turnId, clinicId },
//     data: {
//       clientId: data.clientId ?? undefined,
//       petId: data.petId ?? undefined,
//       petName: data.petName ?? undefined,
//       species: data.species ?? undefined,
//       ownerName: data.ownerName ?? undefined,
//       ownerPhone: data.ownerPhone ?? undefined,
//       type: data.type ?? undefined,
//       serviceName: data.serviceName ?? undefined,
//       notes: data.notes === "" ? null : (data.notes ?? undefined),
//       estimatedDurationMins: data.estimatedDurationMins ?? undefined,
//     },
//   });

//   if (updated.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

//   const row = await prisma.todayTurn.findFirst({ where: { id: turnId, clinicId } });
//   return NextResponse.json(row);
// }

// export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
//   const clinicId = await getClinicIdOrFail();
//   const { id } = await ctx.params;
//   const turnId = Number(id);
//   if (!Number.isFinite(turnId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

//   const deleted = await prisma.todayTurn.deleteMany({
//     where: { id: turnId, clinicId },
//   });

//   if (deleted.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

//   return NextResponse.json({ ok: true });
// }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
import { TodayTurnUpdateSchema } from "@/lib/validators/today-turns";
import { zodDetails } from "@/lib/zodDetails";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const clinicId = await getClinicIdOrFail();
  const id = Number(params.id);

  const body = await req.json().catch(() => null);
  const parsed = TodayTurnUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  // Seguridad multi-tenant
  const exists = await prisma.todayTurn.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updated = await prisma.todayTurn.update({
    where: { id },
    data: {
      ...parsed.data,
      // normaliza vacíos:
      notes: parsed.data.notes ?? undefined,
      ownerPhone: parsed.data.ownerPhone ?? undefined,
    },
    include: {
      pet: { select: { id: true, name: true, species: true } },
      client: { select: { id: true, fullName: true, phone: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const clinicId = await getClinicIdOrFail();
  const id = Number(params.id);

  const exists = await prisma.todayTurn.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.todayTurn.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
