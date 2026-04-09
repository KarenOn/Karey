import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type SeedUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  roleKey: "owner" | "admin" | "vet" | "reception";
};

const USERS: SeedUser[] = [
  {
    id: "user_owner_demo",
    name: "Owner Demo",
    email: "owner@demo.com",
    password: "Password123!",
    roleKey: "owner",
  },
  {
    id: "user_admin_demo",
    name: "Admin Demo",
    email: "admin@demo.com",
    password: "Password123!",
    roleKey: "admin",
  },
  {
    id: "user_vet_demo",
    name: "Vet Demo",
    email: "vet@demo.com",
    password: "Password123!",
    roleKey: "vet",
  },
  {
    id: "user_reception_demo",
    name: "Reception Demo",
    email: "reception@demo.com",
    password: "Password123!",
    roleKey: "reception",
  },
];

async function main() {
  // 1) Clinic (crea una si no existe)
  const existingClinic = await prisma.clinic.findFirst();
  const clinic =
    existingClinic ??
    (await prisma.clinic.create({
      data: {
        name: "VetCare Demo Clinic",
        timezone: "America/Santo_Domingo",
        currency: "USD",
        phone: "+1 809 000 0000",
        email: "clinic@demo.com",
        address: "Santo Domingo",
        socialMedia: { instagram: "@vetcare" },
      },
    }));

  // 2) Roles del sistema (con permisos ejemplo)
  const rolePayloads = [
    {
      key: "owner",
      name: "Owner",
      description: "Acceso total a la clínica",
      permissions: {
        clinic: ["read", "update"],
        employees: ["read", "invite", "update", "delete"],
        roles: ["read", "manage"],
        appointments: ["read", "create", "update", "delete"],
        invoices: ["read", "create", "update", "delete"],
        inventory: ["read", "create", "update", "delete"],
        clients: ["read", "create", "update", "delete"],
        reports: ["read"],
      },
      isSystem: true,
    },
    {
      key: "admin",
      name: "Administrator",
      description: "Administra la operación",
      permissions: {
        clinic: ["read"],
        employees: ["read", "invite", "update"],
        roles: ["read", "manage"],
        appointments: ["read", "create", "update"],
        invoices: ["read", "create", "update"],
        inventory: ["read", "create", "update"],
        clients: ["read", "create", "update"],
        reports: ["read"],
      },
      isSystem: true,
    },
    {
      key: "vet",
      name: "Veterinarian",
      description: "Gestiona citas y visitas clínicas",
      permissions: {
        appointments: ["read", "update"],
        visits: ["read", "create", "update"],
        clients: ["read"],
        inventory: ["read"],
        invoices: ["read"],
      },
      isSystem: true,
    },
    {
      key: "reception",
      name: "Reception",
      description: "Agenda y atención al cliente",
      permissions: {
        appointments: ["read", "create", "update"],
        clients: ["read", "create", "update"],
        todayTurn: ["read", "create", "update"],
        invoices: ["read", "create"],
      },
      isSystem: true,
    },
  ] as const;

  // upsert por unique(clinicId,key)
  const roles = await Promise.all(
    rolePayloads.map((r) =>
      prisma.role.upsert({
        where: { clinicId_key: { clinicId: clinic.id, key: r.key } },
        update: {
          name: r.name,
          description: r.description,
          permissions: r.permissions as Prisma.InputJsonValue,
          isActive: true,
          isSystem: r.isSystem,
        },
        create: {
          clinicId: clinic.id,
          key: r.key,
          name: r.name,
          description: r.description,
          permissions: r.permissions as Prisma.InputJsonValue,
          isActive: true,
          isSystem: r.isSystem,
        },
      })
    )
  );

  const roleByKey = new Map(roles.map((r) => [r.key, r]));

  // 3) ClinicSchedule (7 días)
  const schedule = [
    { day: "monday", open: "08:00", close: "18:00", closed: false },
    { day: "tuesday", open: "08:00", close: "18:00", closed: false },
    { day: "wednesday", open: "08:00", close: "18:00", closed: false },
    { day: "thursday", open: "08:00", close: "18:00", closed: false },
    { day: "friday", open: "08:00", close: "18:00", closed: false },
    { day: "saturday", open: "09:00", close: "13:00", closed: false },
    { day: "sunday", open: null, close: null, closed: true },
  ] as const;

  await Promise.all(
    schedule.map((s) =>
      prisma.clinicSchedule.upsert({
        where: { clinicId_day: { clinicId: clinic.id, day: s.day } },
        update: {
          open: s.open,
          close: s.close,
          closed: s.closed,
        },
        create: {
          clinicId: clinic.id,
          day: s.day,
          open: s.open,
          close: s.close,
          closed: s.closed,
        },
      })
    )
  );

  // 4) Users + Account (credentials) + Membership
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, emailVerified: true, role: u.roleKey },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: true,
        role: u.roleKey,
      },
    });

    // Account “credentials” (Better Auth suele usar password aquí)
    // Si tu implementación usa otro providerId, cámbialo (ej: "email")
    const accountId = `acct_${u.roleKey}_credentials`;

    await prisma.account.upsert({
      where: { id: accountId },
      update: {
        userId: user.id,
        accountId: user.email,
        providerId: "credentials",
        password: passwordHash,
      },
      create: {
        id: accountId,
        userId: user.id,
        accountId: user.email,
        providerId: "credentials",
        password: passwordHash,
      },
    });

    // Membership (unique clinicId + userId)
    const role = roleByKey.get(u.roleKey);
    if (!role) throw new Error(`Role not found for key ${u.roleKey}`);

    await prisma.clinicMember.upsert({
      where: { clinicId_userId: { clinicId: clinic.id, userId: user.id } },
      update: { roleId: role.id, isActive: true },
      create: {
        clinicId: clinic.id,
        userId: user.id,
        roleId: role.id,
        isActive: true,
      },
    });
  }

  // 5) Servicios (ejemplo)
  const services = [
    { name: "Consulta General", price: "25.00", category: "Consulta", durationMins: 30 },
    { name: "Vacunación", price: "15.00", category: "Vacunas", durationMins: 15 },
    { name: "Desparasitación", price: "12.00", category: "Preventivo", durationMins: 15 },
  ] as const;

  for (const s of services) {
    await prisma.service.upsert({
      where: { clinicId_name: { clinicId: clinic.id, name: s.name } },
      update: {
        category: s.category,
        durationMins: s.durationMins,
        price: new Prisma.Decimal(s.price),
        isActive: true,
      },
      create: {
        clinicId: clinic.id,
        name: s.name,
        category: s.category,
        durationMins: s.durationMins,
        price: new Prisma.Decimal(s.price),
        isActive: true,
      },
    });
  }

  // 6) Productos (ejemplo)
  const products = [
    { sku: "VITC-001", name: "Vitamina C Pets", price: "9.99", cost: "4.50", category: "Suplementos" },
    { sku: "SHMP-001", name: "Shampoo Antipulgas", price: "7.50", cost: "3.20", category: "Higiene" },
  ] as const;

  for (const p of products) {
    await prisma.product.upsert({
      where: { clinicId_sku: { clinicId: clinic.id, sku: p.sku } },
      update: {
        name: p.name,
        category: p.category,
        price: new Prisma.Decimal(p.price),
        cost: new Prisma.Decimal(p.cost),
        isActive: true,
        trackStock: true,
      },
      create: {
        clinicId: clinic.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: new Prisma.Decimal(p.price),
        cost: new Prisma.Decimal(p.cost),
        isActive: true,
        trackStock: true,
      },
    });
  }

  // 7) Catálogo de vacunas (ejemplo)
  const vaccines = [
    { name: "Rabia", species: "DOG", intervalValue: 1, intervalUnit: "YEARS" },
    { name: "Triple Felina", species: "CAT", intervalValue: 1, intervalUnit: "YEARS" },
  ] as const;

  for (const v of vaccines) {
    await prisma.vaccineCatalog.upsert({
      where: { clinicId_name: { clinicId: clinic.id, name: v.name } },
      update: {
        species: v.species,
        intervalValue: v.intervalValue,
        intervalUnit: v.intervalUnit,
        isActive: true,
      },
      create: {
        clinicId: clinic.id,
        name: v.name,
        species: v.species,
        intervalValue: v.intervalValue,
        intervalUnit: v.intervalUnit,
        isActive: true,
      },
    });
  }

  console.log("✅ Seed completado:", {
    clinicId: clinic.id,
    users: USERS.map((u) => u.email),
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
