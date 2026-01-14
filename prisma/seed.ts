/* prisma/seed.ts */
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {ClinicRole,
  PetSpecies,
  PetSex,
  AppointmentStatus,
  InvoiceStatus,
  InvoiceItemType,
  PaymentMethod,
  StockMovementType,
  NotificationChannel,
  NotificationStatus,
  VaccineIntervalUnit,
  Prisma,
} from "@/generated/prisma/client"

// const prisma = new PrismaClient();

/** Helpers */
const dec = (n: number | string) => new Prisma.Decimal(n);
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

function startAtToday(hours: number, minutes: number) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Seeding...");

  /** 1) BetterAuth Users (IDs string) */
  const ownerId = randomUUID();
  const vetId = randomUUID();
  const receptionId = randomUUID();

//   const [owner, vet, reception] = await Promise.all([
//     prisma.user.upsert({
//       where: { email: "owner@vetcare.test" },
//       update: {},
//       create: {
//         id: ownerId,
//         name: "Karen Owner",
//         email: "owner@vetcare.test",
//         emailVerified: true,
//         image: null,
//       },
//     }),
//     prisma.user.upsert({
//       where: { email: "vet@vetcare.test" },
//       update: {},
//       create: {
//         id: vetId,
//         name: "Dr. Steven Vet",
//         email: "vet@vetcare.test",
//         emailVerified: true,
//         image: null,
//       },
//     }),
//     prisma.user.upsert({
//       where: { email: "reception@vetcare.test" },
//       update: {},
//       create: {
//         id: receptionId,
//         name: "Franklin Reception",
//         email: "reception@vetcare.test",
//         emailVerified: true,
//         image: null,
//       },
//     }),
//   ]);

  // Opcional: Account + Session (solo para tener data en tablas)
//   await prisma.account.create({
//     data: {
//       id: randomUUID(),
//       accountId: owner.email,
//       providerId: "credentials",
//       userId: owner.id,
//       password: "hashed:demo-password",
//       scope: null,
//       accessToken: null,
//       refreshToken: null,
//       idToken: null,
//       accessTokenExpiresAt: null,
//       refreshTokenExpiresAt: null,
//     },
//   });

//   await prisma.session.create({
//     data: {
//       id: randomUUID(),
//       token: randomUUID(),
//       userId: owner.id,
//       expiresAt: daysFromNow(7),
//       ipAddress: "127.0.0.1",
//       userAgent: "seed-script",
//     },
//   });

//   await prisma.verification.create({
//     data: {
//       id: randomUUID(),
//       identifier: "owner@vetcare.test",
//       value: "OTP-123456",
//       expiresAt: daysFromNow(1),
//     },
//   });

  /** 2) Clinic */
  const clinic = await prisma.clinic.create({
    data: {
      name: "VetCare",
      phone: "+1 (809) 555-0101",
      email: "info@vetcare.test",
      address: "Santo Domingo, D.N.",
      currency: "USD",
      timezone: "America/Santo_Domingo",
    },
  });

  /** 3) Clinic members */
  await prisma.clinicMember.createMany({
    data: [
      {
        clinicId: clinic.id,
        userId: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
        role: ClinicRole.OWNER,
        isActive: true,
      },
    //   {
    //     clinicId: clinic.id,
    //     userId: vet.id,
    //     role: ClinicRole.VET,
    //     isActive: true,
    //   },
    //   {
    //     clinicId: clinic.id,
    //     userId: reception.id,
    //     role: ClinicRole.RECEPTION,
    //     isActive: true,
    //   },
    ],
    skipDuplicates: true,
  });

  /** 4) Clients */
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        clinicId: clinic.id,
        fullName: "María García Hernández",
        phone: "809-111-2222",
        email: "maria@example.com",
        address: "Bella Vista",
        notes: "Prefiere citas en la mañana.",
      },
    }),
    prisma.client.create({
      data: {
        clinicId: clinic.id,
        fullName: "Carlos Rodríguez López",
        phone: "809-333-4444",
        email: "carlos@example.com",
        address: "Gazcue",
        notes: null,
      },
    }),
    prisma.client.create({
      data: {
        clinicId: clinic.id,
        fullName: "Ana Martínez Sánchez",
        phone: "809-555-6666",
        email: "ana@example.com",
        address: "Naco",
        notes: "Mascota nerviosa, tratar con calma.",
      },
    }),
    prisma.client.create({
      data: {
        clinicId: clinic.id,
        fullName: "Luis Peña",
        phone: "809-777-8888",
        email: "luis@example.com",
        address: "Piantuini",
        notes: null,
      },
    }),
    prisma.client.create({
      data: {
        clinicId: clinic.id,
        fullName: "Sofía Ramírez",
        phone: "829-999-0000",
        email: "sofia@example.com",
        address: "Los Prados",
        notes: null,
      },
    }),
  ]);

  /** 5) Pets */
  const pets = await Promise.all([
    prisma.pet.create({
      data: {
        clinicId: clinic.id,
        clientId: clients[0].id,
        name: "Luna",
        species: PetSpecies.DOG,
        breed: "Mestizo",
        sex: PetSex.FEMALE,
        color: "Blanco",
        birthDate: daysAgo(900),
        microchip: "MC-LUNA-0001",
        weightKg: 12.4,
        notes: "Alergia leve a pulgas.",
      },
    }),
    prisma.pet.create({
      data: {
        clinicId: clinic.id,
        clientId: clients[1].id,
        name: "Max",
        species: PetSpecies.CAT,
        breed: "Siamés",
        sex: PetSex.MALE,
        color: "Crema",
        birthDate: daysAgo(1200),
        microchip: "MC-MAX-0002",
        weightKg: 4.8,
        notes: null,
      },
    }),
    prisma.pet.create({
      data: {
        clinicId: clinic.id,
        clientId: clients[2].id,
        name: "Rocky",
        species: PetSpecies.DOG,
        breed: "Bulldog",
        sex: PetSex.MALE,
        color: "Marrón",
        birthDate: daysAgo(700),
        microchip: "MC-ROCKY-0003",
        weightKg: 18.0,
        notes: "Revisar piel.",
      },
    }),
    prisma.pet.create({
      data: {
        clinicId: clinic.id,
        clientId: clients[3].id,
        name: "Kiwi",
        species: PetSpecies.BIRD,
        breed: "Periquito",
        sex: PetSex.UNKNOWN,
        color: "Verde",
        birthDate: daysAgo(400),
        microchip: null,
        weightKg: 0.09,
        notes: null,
      },
    }),
    prisma.pet.create({
      data: {
        clinicId: clinic.id,
        clientId: clients[4].id,
        name: "Nina",
        species: PetSpecies.RABBIT,
        breed: "Mini Lop",
        sex: PetSex.FEMALE,
        color: "Gris",
        birthDate: daysAgo(500),
        microchip: null,
        weightKg: 1.9,
        notes: "Revisión dental anual.",
      },
    }),
    prisma.pet.create({
      data: {
        clinicId: clinic.id,
        clientId: clients[0].id,
        name: "Toby",
        species: PetSpecies.DOG,
        breed: "Yorkie",
        sex: PetSex.MALE,
        color: "Negro/café",
        birthDate: daysAgo(300),
        microchip: null,
        weightKg: 3.2,
        notes: null,
      },
    }),
  ]);

  /** 6) Services */
  const services = await Promise.all([
    prisma.service.create({
      data: {
        clinicId: clinic.id,
        name: "Consulta General",
        description: "Evaluación general y recomendaciones.",
        durationMins: 30,
        price: dec(25),
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        clinicId: clinic.id,
        name: "Vacunación",
        description: "Aplicación de vacuna según esquema.",
        durationMins: 15,
        price: dec(18),
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        clinicId: clinic.id,
        name: "Desparasitación",
        description: "Desparasitación interna/externa.",
        durationMins: 20,
        price: dec(12),
        isActive: true,
      },
    }),
  ]);

  /** 7) Products */
  const products = await Promise.all([
    prisma.product.create({
      data: {
        clinicId: clinic.id,
        sku: "HIG-0001",
        name: "Shampoo Dermatológico",
        category: "Higiene",
        unit: "unidad",
        cost: dec(6),
        price: dec(10),
        trackStock: true,
        stockOnHand: 2, // bajo
        minStock: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        clinicId: clinic.id,
        sku: "MED-0002",
        name: "Amoxicilina 500mg",
        category: "Medicamento",
        unit: "caja",
        cost: dec(8),
        price: dec(14),
        trackStock: true,
        stockOnHand: 3, // bajo
        minStock: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        clinicId: clinic.id,
        sku: "VAC-0003",
        name: "Vacuna Rabia",
        category: "Vacuna",
        unit: "dosis",
        cost: dec(9),
        price: dec(18),
        trackStock: true,
        stockOnHand: 12,
        minStock: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        clinicId: clinic.id,
        sku: "ACC-0004",
        name: "Collar Antipulgas",
        category: "Accesorio",
        unit: "unidad",
        cost: dec(7),
        price: dec(15),
        trackStock: true,
        stockOnHand: 0, // crítico
        minStock: 3,
        isActive: true,
      },
    }),
  ]);

  /** 8) Stock Movements (para historial) */
  await prisma.stockMovement.createMany({
    data: [
      {
        clinicId: clinic.id,
        productId: products[0].id,
        type: StockMovementType.IN,
        quantity: 10,
        reason: "Compra proveedor",
        referenceType: "PURCHASE_ORDER",
        referenceId: "PO-0001",
        createdById: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
      },
      {
        clinicId: clinic.id,
        productId: products[0].id,
        type: StockMovementType.OUT,
        quantity: 8,
        reason: "Ventas",
        referenceType: "INVOICE",
        referenceId: "FAC-20250110-0001",
        createdById: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
      },
      {
        clinicId: clinic.id,
        productId: products[3].id,
        type: StockMovementType.OUT,
        quantity: 3,
        reason: "Ventas",
        referenceType: "INVOICE",
        referenceId: "FAC-20250108-0001",
        createdById: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
      },
    ],
  });

  /** 9) Vaccine Catalog */
  const vaccines = await Promise.all([
    prisma.vaccineCatalog.create({
      data: {
        clinicId: clinic.id,
        name: "Rabia",
        species: PetSpecies.DOG,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Refuerzo anual recomendado.",
        isActive: true,
      },
    }),
    prisma.vaccineCatalog.create({
      data: {
        clinicId: clinic.id,
        name: "Parvovirus",
        species: PetSpecies.DOG,
        intervalValue: 15,
        intervalUnit: VaccineIntervalUnit.DAYS,
        notes: "Refuerzo a los 15 días (según criterio).",
        isActive: true,
      },
    }),
    prisma.vaccineCatalog.create({
      data: {
        clinicId: clinic.id,
        name: "Triple Felina",
        species: PetSpecies.CAT,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: null,
        isActive: true,
      },
    }),
  ]);

  /** 10) Appointments */
  const apptToday1 = await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      clientId: clients[0].id,
      petId: pets[0].id,
      startAt: startAtToday(10, 0),
      endAt: startAtToday(10, 30),
      status: AppointmentStatus.CONFIRMED,
      reason: "Control general",
      notes: "Revisión piel",
      vetId: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
    },
  });

  const apptToday2 = await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      clientId: clients[1].id,
      petId: pets[1].id,
      startAt: startAtToday(11, 30),
      endAt: startAtToday(12, 0),
      status: AppointmentStatus.SCHEDULED,
      reason: "Vacuna",
      notes: null,
      vetId: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
    },
  });

  const apptFuture1 = await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      clientId: clients[2].id,
      petId: pets[2].id,
      startAt: daysFromNow(2),
      endAt: daysFromNow(2),
      status: AppointmentStatus.SCHEDULED,
      reason: "Dermatitis",
      notes: "Evaluar alergias",
      vetId: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
    },
  });

  const apptFuture2 = await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      clientId: clients[4].id,
      petId: pets[4].id,
      startAt: daysFromNow(5),
      endAt: daysFromNow(5),
      status: AppointmentStatus.CONFIRMED,
      reason: "Chequeo dental",
      notes: null,
      vetId: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
    },
  });

  /** 11) Clinical Visit + Attachment + VaccinationRecord */
  const visit1 = await prisma.clinicalVisit.create({
    data: {
      clinicId: clinic.id,
      clientId: clients[0].id,
      petId: pets[0].id,
      appointmentId: apptToday1.id,
      vetId: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
      visitAt: startAtToday(10, 5),
      weightKg: 12.5,
      temperatureC: 38.4,
      diagnosis: "Dermatitis leve",
      treatment: "Baño medicado + control en 15 días",
      notes: "Evitar contacto con pulgas",
    },
  });

  await prisma.medicalAttachment.create({
    data: {
      clinicId: clinic.id,
      visitId: visit1.id,
      fileName: "receta-luna.pdf",
      fileType: "application/pdf",
      url: "https://example.com/files/receta-luna.pdf",
    },
  });

  await prisma.vaccinationRecord.createMany({
    data: [
      {
        clinicId: clinic.id,
        petId: pets[0].id,
        vaccineId: vaccines[1].id, // Parvovirus
        visitId: visit1.id,
        appliedAt: startAtToday(10, 10),
        nextDueAt: daysFromNow(10), // dentro de 30 días (para dashboard)
        batchNumber: "BATCH-PARVO-2025-01",
        notes: "Sin reacciones",
      },
      {
        clinicId: clinic.id,
        petId: pets[1].id,
        vaccineId: vaccines[2].id, // Triple Felina
        visitId: null,
        appliedAt: daysAgo(20),
        nextDueAt: daysFromNow(7),
        batchNumber: "BATCH-TF-2025-01",
        notes: null,
      },
    ],
  });

  /** 12) Invoices + Items + Payments (recientes) */
  const inv1 = await prisma.invoice.create({
    data: {
      clinicId: clinic.id,
      clientId: clients[0].id,
      petId: pets[0].id,
      appointmentId: apptToday1.id,
      number: "FAC-20250110-0001",
      status: InvoiceStatus.PAID,
      issueDate: daysAgo(1),
      dueDate: daysFromNow(10),
      paidAt: daysAgo(1),
      subtotal: dec(50),
      tax: dec(0),
      discount: dec(0),
      total: dec(50),
      notes: "Gracias por su visita.",
      createdById: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
      items: {
        create: [
          {
            type: InvoiceItemType.SERVICE,
            serviceId: services[0].id,
            productId: null,
            description: "Consulta General",
            quantity: dec(1),
            unitPrice: dec(25),
            taxRate: dec(0),
            lineTotal: dec(25),
          },
          {
            type: InvoiceItemType.PRODUCT,
            serviceId: null,
            productId: products[0].id,
            description: "Shampoo Dermatológico",
            quantity: dec(1),
            unitPrice: dec(25),
            taxRate: dec(0),
            lineTotal: dec(25),
          },
        ],
      },
      payments: {
        create: [
          {
            amount: dec(50),
            method: PaymentMethod.CASH,
            reference: "Caja",
            paidAt: daysAgo(1),
            createdById: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
          },
        ],
      },
    },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      clinicId: clinic.id,
      clientId: clients[1].id,
      petId: pets[1].id,
      appointmentId: null,
      number: "FAC-20250109-0001",
      status: InvoiceStatus.ISSUED,
      issueDate: daysAgo(2),
      dueDate: daysFromNow(8),
      paidAt: null,
      subtotal: dec(18),
      tax: dec(0),
      discount: dec(0),
      total: dec(18),
      notes: null,
      createdById: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
      items: {
        create: [
          {
            type: InvoiceItemType.SERVICE,
            serviceId: services[1].id,
            productId: null,
            description: "Vacunación",
            quantity: dec(1),
            unitPrice: dec(18),
            taxRate: dec(0),
            lineTotal: dec(18),
          },
        ],
      },
    },
  });

  const inv3 = await prisma.invoice.create({
    data: {
      clinicId: clinic.id,
      clientId: clients[2].id,
      petId: pets[2].id,
      appointmentId: null,
      number: "FAC-20250108-0001",
      status: InvoiceStatus.ISSUED,
      issueDate: daysAgo(3),
      dueDate: daysFromNow(7),
      paidAt: null,
      subtotal: dec(34.8),
      tax: dec(0),
      discount: dec(0),
      total: dec(34.8),
      notes: "Pendiente de pago.",
      createdById: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
      items: {
        create: [
          {
            type: InvoiceItemType.PRODUCT,
            serviceId: null,
            productId: products[1].id,
            description: "Amoxicilina 500mg",
            quantity: dec(2),
            unitPrice: dec(17.4),
            taxRate: dec(0),
            lineTotal: dec(34.8),
          },
        ],
      },
    },
  });

  /** 13) Notifications + recipients */
  const notification = await prisma.notification.create({
    data: {
      clinicId: clinic.id,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      title: "Recordatorio",
      message: "Vacunas próximas esta semana. Revisa el panel.",
      scheduledAt: null,
      sentAt: new Date(),
      error: null,
      meta: { type: "dashboard_hint" },
      createdById: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
      recipients: {
        create: [
          {
            userId: "EYYOHa8RP4OEapr5FrBZcDJarORXdWyQ",
            clientId: null,
            email: "owner@vetcare.test",
            phone: null,
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            error: null,
          },
          {
            userId: null,
            clientId: clients[0].id,
            email: clients[0].email ?? "maria@example.com",
            phone: clients[0].phone ?? null,
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            error: null,
          },
        ],
      },
    },
  });

  console.log("✅ Seed done!");
//   console.log({
//     clinicId: clinic.id,
//     users: { owner: "owner@vetcare.test", vet: vet.email, reception: reception.email },
//     sampleInvoices: [inv1.number, inv2.number, inv3.number],
//     notificationId: notification.id,
//   });
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
