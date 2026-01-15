// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getClinicIdOrFail } from "@/lib/auth"; // ajusta la ruta real
// import { TodayTurnCreateSchema } from "@/lib/validators/today-turns";

// function dayRange(dateStr?: string | null) {
//   const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
//   const start = new Date(d);
//   start.setHours(0, 0, 0, 0);
//   const end = new Date(d);
//   end.setHours(23, 59, 59, 999);
//   return { start, end };
// }

// export async function GET(req: Request) {
//   const clinicId = await getClinicIdOrFail();
//   const { searchParams } = new URL(req.url);
//   const date = searchParams.get("date"); // YYYY-MM-DD opcional

//   const { start, end } = dayRange(date);

//   const rows = await prisma.todayTurn.findMany({
//     where: {
//       clinicId,
//       arrivalAt: { gte: start, lte: end },
//     },
//     orderBy: { arrivalAt: "asc" },
//   });

//   return NextResponse.json(rows);
// }

// export async function POST(req: Request) {
//   const clinicId = await getClinicIdOrFail();
//   const body = await req.json().catch(() => null);

//   const parsed = TodayTurnCreateSchema.safeParse(body);
//   if (!parsed.success) {
//     return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 422 });
//   }

//   const input = parsed.data;

//   const created = await prisma.todayTurn.create({
//     data: {
//       clinicId,
//       clientId: input.clientId ?? null,
//       petId: input.petId ?? null,

//       petName: input.petName,
//       species: input.species,
//       ownerName: input.ownerName,
//       ownerPhone: input.ownerPhone,

//       type: input.type,
//       serviceName: input.serviceName,
//       notes: input.notes ? input.notes : null,

//       estimatedDurationMins: input.estimatedDurationMins,
//     },
//   });

//   return NextResponse.json(created, { status: 201 });
// }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
import { TodayTurnCreateSchema } from "@/lib/validators/today-turns";
import { zodDetails } from "@/lib/zodDetails"; // si no tienes, te la dejo abajo

export async function GET() {
  const clinicId = await getClinicIdOrFail();

  const turns = await prisma.todayTurn.findMany({
    where: { clinicId },
    orderBy: { arrivalAt: "desc" },
    include: {
      pet: { select: { id: true, name: true, species: true } },
      client: { select: { id: true, fullName: true, phone: true } },
    },
  });

  return NextResponse.json(turns);
}

// export async function POST(req: Request) {
//   const clinicId = await getClinicIdOrFail();
//   console.log("Clinic ID:", clinicId);

//   const body = await req.json().catch(() => null);
//   const parsed = TodayTurnCreateSchema.safeParse(body);

//   if (!parsed.success) {
//     return NextResponse.json(
//       { error: "Datos inválidos", details: zodDetails(parsed.error) },
//       { status: 422 }
//     );
//   }

//   const input = parsed.data;

//   const isExisting = !!input.petId && !!input.clientId;

//   const pet = isExisting
//     ? await prisma.pet.findFirst({
//         where: { id: input.petId!, clinicId },
//         select: { id: true },
//       })
//     : null;

//     const client = isExisting
//     ? await prisma.client.findFirst({
//         where: { id: input.clientId!, clinicId },
//         select: { id: true },
//       })
//     : null;
  
//   const created = await prisma.todayTurn.create({
//     data: {
//       clinic: { connect: { id: clinicId } },

//       ...(isExisting
//         ? {
//             pet: { connect: { id: input.petId! } },
//             client: { connect: { id: input.clientId! } },
//             petName: pet?.name,
//             ownerName: client?.fullName,
//             ownerPhone: client?.phone,
//             species: pet?.species,
//           }
//         : {
//             // ✅ walk-in
//             petId: null,
//             clientId: null,
//             petName: input.petName ?? null,
//             ownerName: input.ownerName ?? null,
//             ownerPhone: input.ownerPhone ?? null,
//             species: input.species ?? null,
//           }),

//       // COMMON
//       type: input.service,
//       serviceName: input.serviceName,
//       notes: input.notes ?? null,
//       estimatedDurationMins: input.estimatedDuration,
//       status: "WAITING",
//     },
//     include: {
//       pet: { select: { id: true, name: true, species: true } },
//       client: { select: { id: true, fullName: true, phone: true } },
//     },
//   });

//   return NextResponse.json(created, { status: 201 });
// }


export async function POST(req: Request) {
  const clinicId = await getClinicIdOrFail();

  const body = await req.json().catch(() => null);
  const parsed = TodayTurnCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const input = parsed.data;
  const isExisting = !!input.petId || !!input.clientId;

  // EXISTING: requiere ambos (tu zod ya lo exige, pero lo mantenemos seguro)
  if (isExisting) {
    if (!input.petId || !input.clientId) {
      return NextResponse.json(
        { error: "Datos inválidos", details: { petId: "Requerido", clientId: "Requerido" } },
        { status: 422 }
      );
    }

    const pet = await prisma.pet.findFirst({
      where: { id: input.petId, clinicId },
      select: { id: true, name: true, species: true, clientId: true },
    });

    const client = await prisma.client.findFirst({
      where: { id: input.clientId, clinicId },
      select: { id: true, fullName: true, phone: true },
    });

    if (!pet) {
      return NextResponse.json({ error: "Mascota no encontrada en esta clínica" }, { status: 404 });
    }
    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado en esta clínica" }, { status: 404 });
    }
    if (pet.clientId !== client.id) {
      return NextResponse.json(
        { error: "Datos inválidos", details: { clientId: "Esta mascota no pertenece a ese cliente" } },
        { status: 422 }
      );
    }

    // Si tu DB requiere phone obligatorio, mejor falla claro aquí:
    if (!client.phone || client.phone.trim().length < 5) {
      return NextResponse.json(
        { error: "El cliente no tiene teléfono válido. Agrégalo al cliente o usa walk-in." },
        { status: 422 }
      );
    }

    const created = await prisma.todayTurn.create({
      data: {
        clinic: { connect: { id: clinicId } },
        pet: { connect: { id: pet.id } },
        client: { connect: { id: client.id } },

        // ✅ denormalizado (no undefined)
        petName: pet.name,
        species: pet.species,
        ownerName: client.fullName,
        ownerPhone: client.phone,

        // common
        type: input.service,
        serviceName: input.serviceName,
        notes: input.notes ?? null,
        estimatedDurationMins: input.estimatedDuration,
        status: "WAITING",
      },
      include: {
        pet: { select: { id: true, name: true, species: true } },
        client: { select: { id: true, fullName: true, phone: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  }

  // WALK-IN
  const created = await prisma.todayTurn.create({
    data: {
      clinic: { connect: { id: clinicId } },
      petId: null,
      clientId: null,

      petName: input.petName!,     // tu zod lo exige en walk-in
      ownerName: input.ownerName!, // tu zod lo exige en walk-in
      ownerPhone: input.ownerPhone!, // si quieres permitir null, dime y lo ajusto al modelo
      species: input.species!,     // tu zod lo exige en walk-in

      type: input.service,
      serviceName: input.serviceName,
      notes: input.notes ?? null,
      estimatedDurationMins: input.estimatedDuration,
      status: "WAITING",
    },
    include: {
      pet: { select: { id: true, name: true, species: true } },
      client: { select: { id: true, fullName: true, phone: true } },
    },
  });

  return NextResponse.json(created, { status: 201 });
}