// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getClinicIdOrFail } from "@/lib/auth";
// import { TodayTurnStatusSchema } from "@/lib/validators/today-turns";
// import { TodayTurnStatus } from "@/generated/prisma/client";

// export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
//   const clinicId = await getClinicIdOrFail();
//   const { id } = await ctx.params;
//   const turnId = Number(id);
//   if (!Number.isFinite(turnId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

//   const body = await req.json().catch(() => null);
//   const parsed = TodayTurnStatusSchema.safeParse(body);

//   if (!parsed.success) {
//     return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 422 });
//   }

//   const { status } = parsed.data;

//   const data: any = { status };

//   // si pasa a READY, no lo marcamos como notificado, solo habilitamos el popup en UI
//   if (status === TodayTurnStatus.CANCELLED) {
//     data.notifiedAt = null;
//   }

//   const updated = await prisma.todayTurn.updateMany({
//     where: { id: turnId, clinicId },
//     data,
//   });

//   if (updated.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

//   const row = await prisma.todayTurn.findFirst({ where: { id: turnId, clinicId } });
//   return NextResponse.json(row);
// }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
import { TodayTurnStatusSchema } from "@/lib/validators/today-turns";
import { z } from "zod";
import { zodDetails } from "@/lib/zodDetails";

const BodySchema = z.object({
  status: TodayTurnStatusSchema,
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const clinicId = await getClinicIdOrFail();
  const id = Number((await params).id);

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const exists = await prisma.todayTurn.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updated = await prisma.todayTurn.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json(updated);
}
