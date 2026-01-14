// // src/server/queries/dashboard.ts
// import { prisma } from "@/lib/prisma";
// import { format } from "date-fns";

// function startOfDay(d: Date) {
//   const x = new Date(d);
//   x.setHours(0, 0, 0, 0);
//   return x;
// }

// function endOfDay(d: Date) {
//   const x = new Date(d);
//   x.setHours(23, 59, 59, 999);
//   return x;
// }

// export async function getDashboardData() {
//   // ✅ Single clinic (por ahora)
//   const clinic = await prisma.clinic.findFirst({
//     select: { id: true, name: true },
//   });

//   if (!clinic) {
//     return {
//       clinicName: "VetCare",
//       clients: [],
//       patients: [],
//       appointments: [],
//       invoices: [],
//       products: [],
//       vaccinations: [],
//       todayAppointmentsCount: 0,
//       monthlyRevenue: 0,
//       upcomingAppointments: [],
//     };
//   }

//   const today = new Date();
//   const dayStart = startOfDay(today);
//   const dayEnd = endOfDay(today);

//   const [clients, patients, todayAppointmentsCount, upcomingAppointmentsDb] =
//     await Promise.all([
//       prisma.client.findMany({
//         where: { clinicId: clinic.id },
//         orderBy: { createdAt: "desc" },
//         take: 500,
//         select: {
//           id: true,
//           fullName: true,
//           phone: true,
//           email: true,
//         },
//       }),
//       prisma.pet.findMany({
//         where: { clinicId: clinic.id },
//         orderBy: { createdAt: "desc" },
//         take: 500,
//         select: {
//           id: true,
//           ownerId: true,
//           name: true,
//           species: true,
//           breed: true,
//         },
//       }),
//       prisma.appointment.count({
//         where: {
//           clinicId: clinic.id,
//           startAt: { gte: dayStart, lte: dayEnd },
//         },
//       }),
//       prisma.appointment.findMany({
//         where: {
//           clinicId: clinic.id,
//           startAt: { gte: dayStart }, // hoy y futuras
//         },
//         orderBy: { startAt: "asc" },
//         take: 100,
//         include: {
//           pet: {
//             select: {
//               id: true,
//               name: true,
//               client: { select: { id: true, fullName: true } },
//             },
//           },
//         },
//       }),
//     ]);

//   // ✅ Mapeo a estructura "simple" para tus componentes actuales
//   const upcomingAppointments = upcomingAppointmentsDb.map((a) => ({
//     id: a.id,
//     date: format(a.startAt, "yyyy-MM-dd"),
//     time: format(a.startAt, "HH:mm"),
//     status: a.status, // si lo tienes como string en Prisma
//     reason: a.reason ?? "",
//     notes: a.notes ?? "",
//     patient_id: a.petId,
//     client_id: a.pet?.client?.id ?? null,
//     patient_name: a.pet?.name ?? "",
//     client_name: a.pet?.client?.fullName ?? "",
//   }));

//   // Estos todavía no existen en tu schema MVP -> los dejamos vacíos para que compile
//   const invoices: any[] = [];
//   const products: any[] = [];
//   const vaccinations: any[] = [];

//   // Revenue (placeholder por ahora)
//   const monthlyRevenue = 0;

//   return {
//     clinicName: clinic.name ?? "VetCare",
//     clients: clients.map((c) => ({
//       id: c.id,
//       name: c.fullName,
//       phone: c.phone,
//       email: c.email,
//     })),
//     patients: patients.map((p) => ({
//       id: p.id,
//       name: p.name,
//       client_id: p.ownerId,
//       species: p.species,
//       breed: p.breed,
//     })),
//     appointments: upcomingAppointments, // si tus widgets usan "appointments"
//     upcomingAppointments,
//     invoices,
//     products,
//     vaccinations,
//     todayAppointmentsCount,
//     monthlyRevenue,
//   };
// }

// src/server/queries/dashboard.ts
import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { startOfDay, endOfDay } from "@/lib/utility";

export async function getDashboardData() {
  // ✅ Single clinic (por ahora)
  const clinic = await prisma.clinic.findFirst({
    select: { id: true, name: true },
  });

  if (!clinic) {
    return {
      clinicName: "VetCare",
      clients: [],
      patients: [],
      appointments: [],
      invoices: [],
      products: [],
      vaccinations: [],
      todayAppointmentsCount: 0,
      monthlyRevenue: 0,
      upcomingAppointments: [],
    };
  }

  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const vaccineWindowEnd = addDays(now, 30);

  const [
    clientsDb,
    patientsDb,
    todayAppointmentsCount,
    upcomingAppointmentsDb,
    recentInvoicesDb,
    lowStockProductsDb,
    upcomingVaccinationsDb,
    monthlyRevenueAgg,
  ] = await Promise.all([
    prisma.client.findMany({
      where: { clinicId: clinic.id },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
      },
    }),

    prisma.pet.findMany({
      where: { clinicId: clinic.id },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        clientId: true,
        name: true,
        species: true,
        breed: true,
      },
    }),

    prisma.appointment.count({
      where: {
        clinicId: clinic.id,
        startAt: { gte: dayStart, lte: dayEnd },
      },
    }),

    prisma.appointment.findMany({
      where: {
        clinicId: clinic.id,
        startAt: { gte: dayStart }, // hoy y futuras
      },
      orderBy: { startAt: "asc" },
      take: 100,
      select: {
        id: true,
        startAt: true,
        status: true,
        reason: true,
        notes: true,
        petId: true,
        clientId: true,
        pet: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, fullName: true } },
          },
        },
        client: { select: { id: true, fullName: true } },
      },
    }),

    prisma.invoice.findMany({
      where: { clinicId: clinic.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        number: true,
        status: true,
        issueDate: true,
        total: true,
        clientId: true,
        client: { select: { id: true, fullName: true } },
      },
    }),

    prisma.product.findMany({
      where: {
        clinicId: clinic.id,
        isActive: true,
        trackStock: true,
        stockOnHand: { lte: prisma.product.fields.minStock }, // ❌ Prisma no soporta comparación field-to-field así en MySQL
      },
      take: 20,
      orderBy: [{ stockOnHand: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        stockOnHand: true,
        minStock: true,
      },
    }).catch(async () => {
      // ✅ Fallback: traemos productos y filtramos en JS (simple y seguro para el MVP)
      const all = await prisma.product.findMany({
        where: { clinicId: clinic.id, isActive: true, trackStock: true },
        take: 200,
        orderBy: [{ stockOnHand: "asc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          sku: true,
          name: true,
          category: true,
          stockOnHand: true,
          minStock: true,
        },
      });

      return all.filter((p) => p.stockOnHand <= p.minStock).slice(0, 20);
    }),

    prisma.vaccinationRecord.findMany({
      where: {
        clinicId: clinic.id,
        nextDueAt: { gte: now, lte: vaccineWindowEnd },
      },
      orderBy: { nextDueAt: "asc" },
      take: 20,
      select: {
        id: true,
        petId: true,
        nextDueAt: true,
        appliedAt: true,
        vaccine: { select: { id: true, name: true } },
        pet: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, fullName: true } },
          },
        },
      },
    }),

    prisma.payment.aggregate({
      where: {
        invoice: { clinicId: clinic.id },
        paidAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  // ✅ Mapeo: Upcoming Appointments (para tus componentes actuales)
  const upcomingAppointments = upcomingAppointmentsDb.map((a) => ({
    id: a.id,
    date: format(a.startAt, "yyyy-MM-dd"),
    time: format(a.startAt, "HH:mm"),
    status: a.status,
    reason: a.reason ?? "",
    notes: a.notes ?? "",
    patient_id: a.petId,
    client_id: a.clientId,
    patient_name: a.pet?.name ?? "",
    client_name: a.client?.fullName ?? a.pet?.client?.fullName ?? "",
  }));

  // ✅ Facturas recientes (shape típico para widget)
  const invoices = recentInvoicesDb.map((i) => ({
    id: i.id,
    number: i.number,
    status: i.status,
    date: format(i.issueDate, "yyyy-MM-dd"),
    total: Number(i.total ?? 0),
    client_id: i.clientId,
    client_name: i.client?.fullName ?? "",
  }));

  // ✅ Stock bajo
  const products = lowStockProductsDb.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    stockOnHand: p.stockOnHand,
    minStock: p.minStock,
  }));

  // ✅ Vacunas próximas
  const vaccinations = upcomingVaccinationsDb.map((v) => ({
    id: v.id,
    pet_id: v.petId,
    pet_name: v.pet?.name ?? "",
    client_name: v.pet?.client?.fullName ?? "",
    vaccine_name: v.vaccine?.name ?? "",
    next_due_at: v.nextDueAt ? format(v.nextDueAt, "yyyy-MM-dd") : null,
    applied_at: v.appliedAt ? format(v.appliedAt, "yyyy-MM-dd") : null,
  }));

  const monthlyRevenue = Number(monthlyRevenueAgg._sum.amount ?? 0);

  return {
    clinicName: clinic.name ?? "VetCare",

    clients: clientsDb.map((c) => ({
      id: c.id,
      name: c.fullName,
      phone: c.phone,
      email: c.email,
    })),

    patients: patientsDb.map((p) => ({
      id: p.id,
      name: p.name,
      client_id: p.clientId,
      species: p.species,
      breed: p.breed,
    })),

    // para widgets
    appointments: upcomingAppointments,
    upcomingAppointments,
    invoices,
    products,
    vaccinations,

    todayAppointmentsCount,
    monthlyRevenue,
  };
}
