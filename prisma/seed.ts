import { Prisma } from "@/generated/prisma/client";
import {
  AppointmentStatus,
  AppointmentType,
  InvoiceItemType,
  InvoiceStatus,
  NotificationChannel,
  NotificationStatus,
  PaymentMethod,
  PetSex,
  PetSpecies,
  StockMovementType,
  SubscriptionStatus,
  TodayTurnStatus,
  VaccineIntervalUnit,
  Weekday,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

type RoleKey = "owner" | "admin" | "vet" | "reception";

type SeedUser = {
  key: string;
  id: string;
  name: string;
  email: string;
  password: string;
  roleKey: RoleKey | "superadmin";
  phone?: string;
  jobTitle?: string;
  bio?: string;
};

type SeedService = {
  key: string;
  name: string;
  category: string;
  description: string;
  durationMins: number;
  price: number;
};

type StockMovementSeed = {
  type: typeof StockMovementType[keyof typeof StockMovementType];
  quantity: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  createdByKey: string;
  daysOffset: number;
};

type SeedProduct = {
  key: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  cost: number;
  price: number;
  stockOnHand: number;
  minStock: number;
  description: string;
  requiresPrescription?: boolean;
  movements: StockMovementSeed[];
};

type SeedVaccine = {
  key: string;
  name: string;
  species: typeof PetSpecies[keyof typeof PetSpecies] | null;
  intervalValue: number | null;
  intervalUnit: typeof VaccineIntervalUnit[keyof typeof VaccineIntervalUnit] | null;
  notes?: string;
};

type SeedPet = {
  key: string;
  name: string;
  species: typeof PetSpecies[keyof typeof PetSpecies];
  breed?: string;
  sex: typeof PetSex[keyof typeof PetSex];
  color?: string;
  birthDate?: string;
  microchip?: string;
  weightKg?: number;
  notes?: string;
};

type SeedClient = {
  key: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  pets: SeedPet[];
};

type InvoiceLineSeed = {
  type: "service" | "product" | "custom";
  ref?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  taxRate?: number;
};

type PaymentSeed = {
  amount: number;
  method: typeof PaymentMethod[keyof typeof PaymentMethod];
  reference?: string;
  daysOffset: number;
};

type VaccinationSeed = {
  vaccineKey: string;
  appliedDaysOffset: number;
  nextDueDaysOffset?: number;
  batchNumber?: string;
  notes?: string;
};

type VisitAttachmentSeed = {
  fileName: string;
  fileType: string;
  url: string;
};

type VisitSeed = {
  weightKg?: number;
  temperatureC?: number;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  attachments?: VisitAttachmentSeed[];
  vaccinations?: VaccinationSeed[];
};

type InvoiceSeed = {
  number: string;
  status: typeof InvoiceStatus[keyof typeof InvoiceStatus];
  issueDaysOffset: number;
  dueDaysOffset?: number;
  discount?: number;
  tax?: number;
  notes?: string;
  lines: InvoiceLineSeed[];
  payments?: PaymentSeed[];
};

type AppointmentSeed = {
  key: string;
  clientKey: string;
  petKey: string;
  vetKey?: string;
  type: typeof AppointmentType[keyof typeof AppointmentType];
  daysOffset: number;
  hour: number;
  minute?: number;
  durationMins: number;
  status: typeof AppointmentStatus[keyof typeof AppointmentStatus];
  reason: string;
  notes?: string;
  reminderSent?: boolean;
  invoice?: InvoiceSeed;
  visit?: VisitSeed;
};

type TodayTurnSeed = {
  clientKey?: string;
  petKey?: string;
  petName: string;
  species: typeof PetSpecies[keyof typeof PetSpecies];
  ownerName: string;
  ownerPhone: string;
  type: typeof AppointmentType[keyof typeof AppointmentType];
  serviceName: string;
  notes?: string;
  hour: number;
  minute?: number;
  estimatedDurationMins: number;
  status: typeof TodayTurnStatus[keyof typeof TodayTurnStatus];
};

type NotificationRecipientSeed = {
  userKey?: string;
  clientKey?: string;
  email?: string;
  phone?: string;
  status: typeof NotificationStatus[keyof typeof NotificationStatus];
  sentDaysOffset?: number;
};

type NotificationSeed = {
  channel: typeof NotificationChannel[keyof typeof NotificationChannel];
  status: typeof NotificationStatus[keyof typeof NotificationStatus];
  title: string;
  message: string;
  createdByKey: string;
  scheduledDaysOffset?: number;
  sentDaysOffset?: number;
  meta?: Prisma.InputJsonValue;
  recipients: NotificationRecipientSeed[];
};

type EmployeeInviteSeed = {
  email: string;
  roleKey: RoleKey;
  createdByKey: string;
  expiresInDays: number;
};

type ClinicSeed = {
  id: number;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  timezone: string;
  slogan: string;
  owner: string;
  mobile: string;
  website: string;
  taxName: string;
  taxId: string;
  bankName: string;
  bankAccount: string;
  bankClabe: string;
  invoiceNotes: string;
  invoiceTerms: string;
  socialMedia: Prisma.InputJsonValue;
  plan: string;
  subscriptionStatus: typeof SubscriptionStatus[keyof typeof SubscriptionStatus];
  subscriptionEndDate: number;
  users: SeedUser[];
  services: SeedService[];
  products: SeedProduct[];
  vaccines: SeedVaccine[];
  clients: SeedClient[];
  appointments: AppointmentSeed[];
  todayTurns: TodayTurnSeed[];
  notifications: NotificationSeed[];
  invites: EmployeeInviteSeed[];
};

const DEFAULT_PASSWORD = "KiskeyaVet123!";
const INVITE_PASSWORD = "InvitePending123!";

const SUPERADMIN: SeedUser = {
  key: "superadmin",
  id: "seed_user_superadmin_kiskeyavet",
  name: "Super Admin KiskeyaVet",
  email: "superadmin@kiskeyavet.local",
  password: "SuperAdmin123!",
  roleKey: "superadmin",
  phone: "+1 809 555 0001",
  jobTitle: "Platform Administrator",
  bio: "Cuenta global para soporte y administracion de todas las clinicas.",
};

const ROLE_DEFINITIONS = [
  {
    key: "owner" as const,
    name: "Owner",
    description: "Acceso total a la operacion de la clinica.",
    permissions: {
      clinic: ["read", "update"],
      employees: ["read", "invite", "update", "delete"],
      roles: ["read", "manage"],
      appointments: ["read", "create", "update", "delete"],
      clients: ["read", "create", "update", "delete"],
      pets: ["read", "create", "update", "delete"],
      today: ["read", "create", "update", "delete"],
      todayTurn: ["read", "create", "update", "delete"],
      services: ["read", "create", "update", "delete"],
      inventory: ["read", "create", "update", "delete"],
      invoices: ["read", "create", "update", "delete"],
    },
  },
  {
    key: "admin" as const,
    name: "Administrator",
    description: "Gestion administrativa y coordinacion de equipos.",
    permissions: {
      clinic: ["read", "update"],
      employees: ["read", "invite", "update"],
      roles: ["read", "manage"],
      appointments: ["read", "create", "update"],
      clients: ["read", "create", "update"],
      pets: ["read", "create", "update"],
      today: ["read", "create", "update"],
      todayTurn: ["read", "create", "update"],
      services: ["read", "create", "update"],
      inventory: ["read", "create", "update"],
      invoices: ["read", "create", "update"],
    },
  },
  {
    key: "vet" as const,
    name: "Veterinarian",
    description: "Atencion clinica, control de citas y seguimiento medico.",
    permissions: {
      appointments: ["read", "update"],
      clients: ["read", "update"],
      pets: ["read", "update"],
      today: ["read", "update"],
      todayTurn: ["read", "update"],
      services: ["read"],
      inventory: ["read"],
      invoices: ["read"],
    },
  },
  {
    key: "reception" as const,
    name: "Reception",
    description: "Recepcion, agenda y gestion de caja de mostrador.",
    permissions: {
      appointments: ["read", "create", "update"],
      clients: ["read", "create", "update"],
      pets: ["read", "create", "update"],
      today: ["read", "create", "update"],
      todayTurn: ["read", "create", "update"],
      services: ["read"],
      inventory: ["read"],
      invoices: ["read", "create"],
    },
  },
];

const DEFAULT_SCHEDULE = [
  { day: Weekday.monday, open: "08:00", close: "18:30", closed: false },
  { day: Weekday.tuesday, open: "08:00", close: "18:30", closed: false },
  { day: Weekday.wednesday, open: "08:00", close: "18:30", closed: false },
  { day: Weekday.thursday, open: "08:00", close: "18:30", closed: false },
  { day: Weekday.friday, open: "08:00", close: "18:30", closed: false },
  { day: Weekday.saturday, open: "08:30", close: "14:00", closed: false },
  { day: Weekday.sunday, open: null, close: null, closed: true },
];

const CLINICS: ClinicSeed[] = [
  {
    id: 2,
    code: "C2",
    name: "KiskeyaVet Centro",
    phone: "+1 809 555 0200",
    email: "centro@kiskeyavet.local",
    address: "Av. Abraham Lincoln 1203, Santo Domingo",
    currency: "USD",
    timezone: "America/Santo_Domingo",
    slogan: "Medicina preventiva, cirugia y grooming en un solo lugar.",
    owner: "Camila Rodriguez",
    mobile: "+1 809 555 0201",
    website: "https://centro.kiskeyavet.local",
    taxName: "KiskeyaVet Centro SRL",
    taxId: "131020200",
    bankName: "Banco Popular",
    bankAccount: "010-220022-2",
    bankClabe: "0102200222",
    invoiceNotes: "Gracias por confiar en KiskeyaVet Centro para el cuidado integral de tu mascota.",
    invoiceTerms: "Pagos contra entrega. Los medicamentos abiertos no tienen devolucion.",
    socialMedia: {
      instagram: "@kiskeyavet_centro",
      facebook: "KiskeyaVet Centro",
      whatsapp: "+18095550200",
    },
    plan: "Enterprise",
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    subscriptionEndDate: 365,
    users: [
      {
        key: "owner_camila",
        id: "seed_user_c2_owner_camila",
        name: "Camila Rodriguez",
        email: "camila.centro@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "owner",
        phone: "+1 809 555 0201",
        jobTitle: "Directora medica",
        bio: "Medicina interna, manejo hospitalario y direccion de equipos clinicos.",
      },
      {
        key: "admin_laura",
        id: "seed_user_c2_admin_laura",
        name: "Laura Perez",
        email: "laura.centro@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "admin",
        phone: "+1 809 555 0202",
        jobTitle: "Administradora",
        bio: "Coordina compras, facturacion y experiencia del cliente.",
      },
      {
        key: "vet_daniel",
        id: "seed_user_c2_vet_daniel",
        name: "Daniel Gomez",
        email: "daniel.centro@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "vet",
        phone: "+1 809 555 0203",
        jobTitle: "Veterinario clinico",
        bio: "Consulta general, dermatologia y medicina preventiva.",
      },
      {
        key: "vet_melissa",
        id: "seed_user_c2_vet_melissa",
        name: "Melissa Hernandez",
        email: "melissa.centro@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "vet",
        phone: "+1 809 555 0204",
        jobTitle: "Veterinaria cirujana",
        bio: "Cirugia de tejidos blandos, vacunacion y seguimiento posoperatorio.",
      },
      {
        key: "reception_sofia",
        id: "seed_user_c2_reception_sofia",
        name: "Sofia Martinez",
        email: "sofia.centro@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "reception",
        phone: "+1 809 555 0205",
        jobTitle: "Recepcionista senior",
        bio: "Agenda, caja de mostrador y recordatorios de pacientes.",
      },
      {
        key: "reception_paola",
        id: "seed_user_c2_reception_paola",
        name: "Paola Ruiz",
        email: "paola.centro@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "reception",
        phone: "+1 809 555 0206",
        jobTitle: "Coordinadora de grooming",
        bio: "Flujo de turnos del dia y entregas de pacientes esteticos.",
      },
    ],
    services: [
      {
        key: "consulta_general",
        name: "Consulta general",
        category: "Consulta",
        description: "Evaluacion clinica completa para sintomas agudos o control basico.",
        durationMins: 30,
        price: 30,
      },
      {
        key: "vacunacion",
        name: "Vacunacion",
        category: "Preventivo",
        description: "Aplicacion de vacunas de acuerdo con especie y edad.",
        durationMins: 20,
        price: 22,
      },
      {
        key: "desparasitacion",
        name: "Desparasitacion",
        category: "Preventivo",
        description: "Control antiparasitario interno y externo.",
        durationMins: 15,
        price: 18,
      },
      {
        key: "grooming_completo",
        name: "Grooming completo",
        category: "Estetica",
        description: "Bano, secado, corte y limpieza de oidos.",
        durationMins: 90,
        price: 35,
      },
      {
        key: "limpieza_dental",
        name: "Limpieza dental",
        category: "Odontologia",
        description: "Profilaxis dental con evaluacion oral previa.",
        durationMins: 75,
        price: 85,
      },
      {
        key: "esterilizacion_felina",
        name: "Esterilizacion felina",
        category: "Cirugia",
        description: "Procedimiento programado con monitoreo y analgesia.",
        durationMins: 120,
        price: 140,
      },
      {
        key: "control_dermatologico",
        name: "Control dermatologico",
        category: "Especialidad",
        description: "Revision de lesiones de piel, otitis y alergias.",
        durationMins: 40,
        price: 42,
      },
      {
        key: "hospitalizacion_dia",
        name: "Hospitalizacion por dia",
        category: "Hospitalizacion",
        description: "Observacion, fluidoterapia y controles intradia.",
        durationMins: 720,
        price: 65,
      },
    ],
    products: [
      {
        key: "vacuna_rabia",
        sku: "C2-BIO-001",
        name: "Vacuna antirrabica canina",
        category: "Biologicos",
        unit: "dosis",
        cost: 12,
        price: 20,
        stockOnHand: 26,
        minStock: 8,
        description: "Biologico para refuerzo anual contra rabia.",
        requiresPrescription: true,
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 30,
            reason: "Compra mensual de biologicos",
            createdByKey: "admin_laura",
            daysOffset: -18,
          },
          {
            type: StockMovementType.SALE,
            quantity: 4,
            reason: "Aplicaciones a pacientes del mes",
            createdByKey: "vet_melissa",
            daysOffset: -9,
          },
        ],
      },
      {
        key: "vacuna_triple_felina",
        sku: "C2-BIO-002",
        name: "Vacuna triple felina",
        category: "Biologicos",
        unit: "dosis",
        cost: 13,
        price: 22,
        stockOnHand: 18,
        minStock: 6,
        description: "Cobertura preventiva para rinotraqueitis, calicivirus y panleucopenia.",
        requiresPrescription: true,
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 20,
            reason: "Reposicion trimestral",
            createdByKey: "admin_laura",
            daysOffset: -21,
          },
          {
            type: StockMovementType.SALE,
            quantity: 2,
            reason: "Campana felina de la semana",
            createdByKey: "vet_daniel",
            daysOffset: -6,
          },
        ],
      },
      {
        key: "pipeta_canina",
        sku: "C2-PHA-001",
        name: "Pipeta antipulgas canina",
        category: "Farmacia",
        unit: "unidad",
        cost: 7.5,
        price: 13,
        stockOnHand: 34,
        minStock: 10,
        description: "Control externo mensual para perros pequenos y medianos.",
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 40,
            reason: "Ingreso proveedor principal",
            createdByKey: "admin_laura",
            daysOffset: -20,
          },
          {
            type: StockMovementType.SALE,
            quantity: 6,
            reason: "Ventas de mostrador y consulta",
            createdByKey: "reception_sofia",
            daysOffset: -5,
          },
        ],
      },
      {
        key: "shampoo_hipoalergenico",
        sku: "C2-HIG-001",
        name: "Shampoo hipoalergenico",
        category: "Higiene",
        unit: "frasco",
        cost: 5,
        price: 11,
        stockOnHand: 15,
        minStock: 5,
        description: "Uso topico para pacientes con piel sensible.",
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 18,
            reason: "Reposicion de tienda",
            createdByKey: "admin_laura",
            daysOffset: -17,
          },
          {
            type: StockMovementType.SALE,
            quantity: 3,
            reason: "Venta en consulta dermatologica",
            createdByKey: "reception_paola",
            daysOffset: -14,
          },
        ],
      },
      {
        key: "amoxipet",
        sku: "C2-PHA-002",
        name: "AmoxiPet 250 mg",
        category: "Farmacia",
        unit: "caja",
        cost: 9,
        price: 17,
        stockOnHand: 12,
        minStock: 4,
        description: "Antibiotico oral para tratamientos bajo indicacion veterinaria.",
        requiresPrescription: true,
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 15,
            reason: "Compra de apoyo terapeutico",
            createdByKey: "admin_laura",
            daysOffset: -15,
          },
          {
            type: StockMovementType.SALE,
            quantity: 3,
            reason: "Dispensado en consultas clinicas",
            createdByKey: "vet_daniel",
            daysOffset: -12,
          },
        ],
      },
      {
        key: "suero_rehidratante",
        sku: "C2-HOS-001",
        name: "Suero rehidratante 500 ml",
        category: "Hospitalizacion",
        unit: "bolsa",
        cost: 4,
        price: 9,
        stockOnHand: 20,
        minStock: 8,
        description: "Solucion para soporte de pacientes hospitalizados.",
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 24,
            reason: "Ingreso para area de hospitalizacion",
            createdByKey: "admin_laura",
            daysOffset: -19,
          },
          {
            type: StockMovementType.OUT,
            quantity: 4,
            reason: "Uso interno en observacion de pacientes",
            createdByKey: "vet_melissa",
            daysOffset: -8,
          },
        ],
      },
      {
        key: "collar_isabelino_m",
        sku: "C2-ACC-001",
        name: "Collar isabelino talla M",
        category: "Accesorios",
        unit: "unidad",
        cost: 6,
        price: 13,
        stockOnHand: 9,
        minStock: 3,
        description: "Proteccion postquirurgica para perros y gatos medianos.",
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 12,
            reason: "Ingreso postoperatorio",
            createdByKey: "admin_laura",
            daysOffset: -13,
          },
          {
            type: StockMovementType.SALE,
            quantity: 3,
            reason: "Entregados en pacientes operados",
            createdByKey: "reception_sofia",
            daysOffset: -2,
          },
        ],
      },
      {
        key: "desparasitante_interno",
        sku: "C2-PHA-003",
        name: "Desparasitante interno plus",
        category: "Farmacia",
        unit: "tableta",
        cost: 2,
        price: 5,
        stockOnHand: 48,
        minStock: 15,
        description: "Cobertura interna para adultos y cachorros segun peso.",
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 60,
            reason: "Compra preventiva",
            createdByKey: "admin_laura",
            daysOffset: -16,
          },
          {
            type: StockMovementType.SALE,
            quantity: 12,
            reason: "Tratamientos preventivos del mes",
            createdByKey: "vet_daniel",
            daysOffset: -4,
          },
        ],
      },
    ],
    vaccines: [
      {
        key: "rabia_canina",
        name: "Rabia canina",
        species: PetSpecies.DOG,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Refuerzo anual obligatorio en perros adultos.",
      },
      {
        key: "sextuple_canina",
        name: "Sextuple canina",
        species: PetSpecies.DOG,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Incluye refuerzo contra moquillo, parvovirus y leptospira.",
      },
      {
        key: "bordetella",
        name: "Bordetella",
        species: PetSpecies.DOG,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Recomendada para pacientes con grooming o pension.",
      },
      {
        key: "triple_felina",
        name: "Triple felina",
        species: PetSpecies.CAT,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Esquema base felino anual.",
      },
      {
        key: "leucemia_felina",
        name: "Leucemia felina",
        species: PetSpecies.CAT,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Para gatos con acceso a exterior o convivencia multiple.",
      },
      {
        key: "giardia",
        name: "Giardia canina",
        species: PetSpecies.DOG,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Refuerzo adicional para pacientes de guarderia o pension.",
      },
    ],
    clients: [
      {
        key: "ana_lopez",
        fullName: "Ana Lopez",
        phone: "+1 809 600 1101",
        email: "ana.lopez@example.com",
        address: "Ensanche Piantini, Santo Domingo",
        notes: "Prefiere recordatorios por WhatsApp.",
        pets: [
          {
            key: "luna",
            name: "Luna",
            species: PetSpecies.DOG,
            breed: "Poodle mini",
            sex: PetSex.FEMALE,
            color: "Blanco",
            birthDate: "2021-03-12",
            microchip: "C2-LUNA-0001",
            weightKg: 6.2,
            notes: "Paciente alergica a pollo.",
          },
          {
            key: "milo",
            name: "Milo",
            species: PetSpecies.CAT,
            breed: "Europeo",
            sex: PetSex.MALE,
            color: "Naranja",
            birthDate: "2022-08-05",
            microchip: "C2-MILO-0002",
            weightKg: 4.7,
            notes: "Muy sensible al estres en consulta.",
          },
        ],
      },
      {
        key: "carlos_ramirez",
        fullName: "Carlos Ramirez",
        phone: "+1 809 600 1102",
        email: "carlos.ramirez@example.com",
        address: "Evaristo Morales, Santo Domingo",
        notes: "Solicita factura a nombre personal.",
        pets: [
          {
            key: "rocky",
            name: "Rocky",
            species: PetSpecies.DOG,
            breed: "Labrador",
            sex: PetSex.MALE,
            color: "Chocolate",
            birthDate: "2020-11-18",
            microchip: "C2-ROCKY-0003",
            weightKg: 24.8,
            notes: "Paciente muy sociable con grooming frecuente.",
          },
        ],
      },
      {
        key: "elena_nunez",
        fullName: "Elena Nunez",
        phone: "+1 809 600 1103",
        email: "elena.nunez@example.com",
        address: "Naco, Santo Domingo",
        notes: "Paga usualmente con transferencia.",
        pets: [
          {
            key: "nala",
            name: "Nala",
            species: PetSpecies.CAT,
            breed: "Siamese",
            sex: PetSex.FEMALE,
            color: "Crema",
            birthDate: "2019-07-10",
            microchip: "C2-NALA-0004",
            weightKg: 3.9,
            notes: "Consulta por estomatitis y mantenimiento dental.",
          },
        ],
      },
      {
        key: "jorge_castillo",
        fullName: "Jorge Castillo",
        phone: "+1 809 600 1104",
        email: "jorge.castillo@example.com",
        address: "Los Prados, Santo Domingo",
        notes: "Acepta cambios de horario si se le llama antes de las 9 am.",
        pets: [
          {
            key: "bruno",
            name: "Bruno",
            species: PetSpecies.DOG,
            breed: "Beagle",
            sex: PetSex.MALE,
            color: "Tricolor",
            birthDate: "2021-05-28",
            microchip: "C2-BRUNO-0005",
            weightKg: 11.4,
            notes: "Antecedente de otitis recurrente.",
          },
        ],
      },
      {
        key: "marina_sosa",
        fullName: "Marina Sosa",
        phone: "+1 809 600 1105",
        email: "marina.sosa@example.com",
        address: "Bella Vista, Santo Domingo",
        notes: "Pide citas solo en la tarde.",
        pets: [
          {
            key: "kiwi",
            name: "Kiwi",
            species: PetSpecies.BIRD,
            breed: "Periquito australiano",
            sex: PetSex.UNKNOWN,
            color: "Verde",
            birthDate: "2023-02-14",
            weightKg: 0.08,
            notes: "Revision de pico y plumas.",
          },
        ],
      },
      {
        key: "rosa_perez",
        fullName: "Rosa Perez",
        phone: "+1 809 600 1106",
        email: "rosa.perez@example.com",
        address: "Mirador Sur, Santo Domingo",
        notes: "Aprecia instrucciones escritas de tratamiento.",
        pets: [
          {
            key: "kira",
            name: "Kira",
            species: PetSpecies.RABBIT,
            breed: "Mini Lop",
            sex: PetSex.FEMALE,
            color: "Marron",
            birthDate: "2022-01-19",
            weightKg: 1.7,
            notes: "Control digestivo y corte dental preventivo.",
          },
        ],
      },
      {
        key: "victor_mejia",
        fullName: "Victor Mejia",
        phone: "+1 809 600 1107",
        email: "victor.mejia@example.com",
        address: "Arroyo Hondo, Santo Domingo",
        notes: "Se comunica por llamada directa.",
        pets: [
          {
            key: "thor",
            name: "Thor",
            species: PetSpecies.DOG,
            breed: "Pastor aleman",
            sex: PetSex.MALE,
            color: "Negro y fuego",
            birthDate: "2020-04-03",
            microchip: "C2-THOR-0006",
            weightKg: 31.2,
            notes: "Paciente grande, requiere bozal suave para manicure.",
          },
        ],
      },
    ],
    appointments: [
      {
        key: "c2-appt-001",
        clientKey: "ana_lopez",
        petKey: "luna",
        vetKey: "vet_daniel",
        type: AppointmentType.CONSULTATION,
        daysOffset: -14,
        hour: 10,
        durationMins: 35,
        status: AppointmentStatus.COMPLETED,
        reason: "Prurito, caida de pelo y resequedad de piel.",
        notes: "Se sugiere cambio de shampoo y control a dos semanas.",
        reminderSent: true,
        visit: {
          weightKg: 6.3,
          temperatureC: 38.4,
          diagnosis: "Dermatitis alergica leve sin evidencia de infeccion secundaria.",
          treatment: "Shampoo hipoalergenico semanal y control dermatologico en 15 dias.",
          notes: "Paciente tranquila durante la revision.",
          attachments: [
            {
              fileName: "luna-dermatologia.pdf",
              fileType: "application/pdf",
              url: "https://files.kiskeyavet.local/c2/luna-dermatologia.pdf",
            },
          ],
        },
        invoice: {
          number: "C2-2026-0001",
          status: InvoiceStatus.PAID,
          issueDaysOffset: -14,
          dueDaysOffset: -14,
          notes: "Se entrego plan de control dermatologico.",
          lines: [
            { type: "service", ref: "consulta_general", quantity: 1 },
            { type: "product", ref: "shampoo_hipoalergenico", quantity: 1 },
          ],
          payments: [
            {
              amount: 41,
              method: PaymentMethod.CARD,
              reference: "POS-C2-1001",
              daysOffset: -14,
            },
          ],
        },
      },
      {
        key: "c2-appt-002",
        clientKey: "carlos_ramirez",
        petKey: "rocky",
        vetKey: "vet_melissa",
        type: AppointmentType.VACCINATION,
        daysOffset: -10,
        hour: 16,
        durationMins: 20,
        status: AppointmentStatus.COMPLETED,
        reason: "Refuerzo anual de vacuna y control preventivo.",
        notes: "Paciente apto para esquema anual.",
        reminderSent: true,
        visit: {
          weightKg: 24.8,
          temperatureC: 38.5,
          diagnosis: "Paciente sano para vacunacion y control externo.",
          treatment: "Aplicacion de vacuna antirrabica y recomendacion de pipeta mensual.",
          notes: "Sin reacciones inmediatas postaplicacion.",
          vaccinations: [
            {
              vaccineKey: "rabia_canina",
              appliedDaysOffset: -10,
              nextDueDaysOffset: 355,
              batchNumber: "RAB-C2-2605",
              notes: "Refuerzo anual completado.",
            },
          ],
        },
        invoice: {
          number: "C2-2026-0002",
          status: InvoiceStatus.PAID,
          issueDaysOffset: -10,
          dueDaysOffset: -10,
          lines: [
            { type: "service", ref: "vacunacion", quantity: 1 },
            { type: "product", ref: "vacuna_rabia", quantity: 1 },
            { type: "product", ref: "pipeta_canina", quantity: 1 },
          ],
          payments: [
            {
              amount: 55,
              method: PaymentMethod.CARD,
              reference: "POS-C2-1002",
              daysOffset: -10,
            },
          ],
        },
      },
      {
        key: "c2-appt-003",
        clientKey: "elena_nunez",
        petKey: "nala",
        vetKey: "vet_daniel",
        type: AppointmentType.GROOMING,
        daysOffset: -7,
        hour: 12,
        durationMins: 90,
        status: AppointmentStatus.COMPLETED,
        reason: "Bano, secado y recorte higienico.",
        notes: "Se detecta leve placa dental y se recomienda profilaxis.",
        reminderSent: true,
        invoice: {
          number: "C2-2026-0003",
          status: InvoiceStatus.PAID,
          issueDaysOffset: -7,
          dueDaysOffset: -7,
          lines: [{ type: "service", ref: "grooming_completo", quantity: 1 }],
          payments: [
            {
              amount: 35,
              method: PaymentMethod.CASH,
              daysOffset: -7,
            },
          ],
        },
      },
      {
        key: "c2-appt-004",
        clientKey: "jorge_castillo",
        petKey: "bruno",
        vetKey: "vet_daniel",
        type: AppointmentType.CHECKUP,
        daysOffset: 0,
        hour: 11,
        durationMins: 30,
        status: AppointmentStatus.CONFIRMED,
        reason: "Control de otitis y revision de oidos.",
        notes: "El propietario confirmo por telefono esta manana.",
        reminderSent: true,
      },
      {
        key: "c2-appt-005",
        clientKey: "ana_lopez",
        petKey: "milo",
        vetKey: "vet_melissa",
        type: AppointmentType.SURGERY,
        daysOffset: 3,
        hour: 9,
        durationMins: 120,
        status: AppointmentStatus.SCHEDULED,
        reason: "Esterilizacion programada.",
        notes: "Solicitar ayuno de 8 horas y consentimiento firmado.",
      },
      {
        key: "c2-appt-006",
        clientKey: "marina_sosa",
        petKey: "kiwi",
        vetKey: "vet_daniel",
        type: AppointmentType.CONSULTATION,
        daysOffset: -2,
        hour: 15,
        durationMins: 25,
        status: AppointmentStatus.NO_SHOW,
        reason: "Revision de pico y apetito irregular.",
        notes: "No asistio. Reprogramar si confirma esta semana.",
        reminderSent: true,
      },
      {
        key: "c2-appt-007",
        clientKey: "rosa_perez",
        petKey: "kira",
        vetKey: "vet_melissa",
        type: AppointmentType.DEWORMING,
        daysOffset: 5,
        hour: 14,
        durationMins: 20,
        status: AppointmentStatus.SCHEDULED,
        reason: "Control digestivo y desparasitacion de coneja adulta.",
        notes: "Traer historial previo y peso actualizado.",
      },
    ],
    todayTurns: [
      {
        clientKey: "victor_mejia",
        petKey: "thor",
        petName: "Thor",
        species: PetSpecies.DOG,
        ownerName: "Victor Mejia",
        ownerPhone: "+1 809 600 1107",
        type: AppointmentType.GROOMING,
        serviceName: "Bano medicinal y cepillado",
        notes: "Paciente grande, entrega estimada al final de la tarde.",
        hour: 9,
        estimatedDurationMins: 120,
        status: TodayTurnStatus.IN_PROGRESS,
      },
      {
        petName: "Max",
        species: PetSpecies.DOG,
        ownerName: "Carolina Diaz",
        ownerPhone: "+1 809 600 1199",
        type: AppointmentType.BATH,
        serviceName: "Bano express para cachorro",
        notes: "Walk-in sin ficha previa.",
        hour: 10,
        estimatedDurationMins: 60,
        status: TodayTurnStatus.WAITING,
      },
      {
        clientKey: "elena_nunez",
        petKey: "nala",
        petName: "Nala",
        species: PetSpecies.CAT,
        ownerName: "Elena Nunez",
        ownerPhone: "+1 809 600 1103",
        type: AppointmentType.GROOMING,
        serviceName: "Recorte higienico",
        notes: "Pendiente llamada para retiro.",
        hour: 8,
        minute: 45,
        estimatedDurationMins: 75,
        status: TodayTurnStatus.READY,
      },
    ],
    notifications: [
      {
        channel: NotificationChannel.WHATSAPP,
        status: NotificationStatus.SENT,
        title: "Recordatorio de control",
        message: "Bruno tiene control confirmado hoy a las 11:00 AM en KiskeyaVet Centro.",
        createdByKey: "reception_sofia",
        scheduledDaysOffset: 0,
        sentDaysOffset: 0,
        meta: { appointmentKey: "c2-appt-004", priority: "normal" },
        recipients: [
          {
            clientKey: "jorge_castillo",
            phone: "+1 809 600 1104",
            status: NotificationStatus.SENT,
            sentDaysOffset: 0,
          },
        ],
      },
      {
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.SENT,
        title: "Campana de vacunas felinas",
        message: "Agenda el refuerzo anual de tu gato y recibe evaluacion preventiva en la misma visita.",
        createdByKey: "admin_laura",
        scheduledDaysOffset: -3,
        sentDaysOffset: -3,
        meta: { segment: "cat-owners", campaign: "feline-annual-2026" },
        recipients: [
          {
            clientKey: "ana_lopez",
            email: "ana.lopez@example.com",
            status: NotificationStatus.SENT,
            sentDaysOffset: -3,
          },
          {
            clientKey: "elena_nunez",
            email: "elena.nunez@example.com",
            status: NotificationStatus.SENT,
            sentDaysOffset: -3,
          },
        ],
      },
      {
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.QUEUED,
        title: "Alerta de stock",
        message: "El collar isabelino talla M se acerca a su minimo operativo.",
        createdByKey: "admin_laura",
        meta: { productKey: "collar_isabelino_m", minStock: 3, currentStock: 9 },
        recipients: [
          {
            userKey: "admin_laura",
            status: NotificationStatus.QUEUED,
          },
          {
            userKey: "owner_camila",
            status: NotificationStatus.QUEUED,
          },
        ],
      },
    ],
    invites: [
      {
        email: "pasante.centro@kiskeyavet.local",
        roleKey: "vet",
        createdByKey: "owner_camila",
        expiresInDays: 5,
      },
      {
        email: "caja.centro@kiskeyavet.local",
        roleKey: "reception",
        createdByKey: "admin_laura",
        expiresInDays: 7,
      },
    ],
  },
  {
    id: 3,
    code: "C3",
    name: "KiskeyaVet Bella Vista",
    phone: "+1 809 555 0300",
    email: "bellavista@kiskeyavet.local",
    address: "Av. Sarasota 88, Bella Vista, Santo Domingo",
    currency: "USD",
    timezone: "America/Santo_Domingo",
    slogan: "Atencion clinica avanzada, urgencias leves y odontologia veterinaria.",
    owner: "Ricardo Santana",
    mobile: "+1 809 555 0301",
    website: "https://bellavista.kiskeyavet.local",
    taxName: "KiskeyaVet Bella Vista SRL",
    taxId: "131030300",
    bankName: "Banreservas",
    bankAccount: "020-330033-3",
    bankClabe: "0203300333",
    invoiceNotes: "Mantenga el plan preventivo de su mascota al dia para mejores resultados clinicos.",
    invoiceTerms: "Facturas validas por 30 dias. Abonos parciales no son reembolsables.",
    socialMedia: {
      instagram: "@kiskeyavet_bellavista",
      facebook: "KiskeyaVet Bella Vista",
      whatsapp: "+18095550300",
    },
    plan: "Growth",
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    subscriptionEndDate: 240,
    users: [
      {
        key: "owner_ricardo",
        id: "seed_user_c3_owner_ricardo",
        name: "Ricardo Santana",
        email: "ricardo.bellavista@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "owner",
        phone: "+1 809 555 0301",
        jobTitle: "Director de sucursal",
        bio: "Gestion de sucursal, relacion con clientes y supervision de medicos.",
      },
      {
        key: "admin_valeria",
        id: "seed_user_c3_admin_valeria",
        name: "Valeria Pena",
        email: "valeria.bellavista@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "admin",
        phone: "+1 809 555 0302",
        jobTitle: "Administradora",
        bio: "Control de agenda, compras y cierre de caja.",
      },
      {
        key: "vet_adrian",
        id: "seed_user_c3_vet_adrian",
        name: "Adrian Cruz",
        email: "adrian.bellavista@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "vet",
        phone: "+1 809 555 0303",
        jobTitle: "Veterinario clinico",
        bio: "Urgencias leves, imagenes y medicina interna.",
      },
      {
        key: "vet_julissa",
        id: "seed_user_c3_vet_julissa",
        name: "Julissa Aquino",
        email: "julissa.bellavista@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "vet",
        phone: "+1 809 555 0304",
        jobTitle: "Veterinaria odontologa",
        bio: "Limpieza dental, analgesia y control preventivo en pacientes senior.",
      },
      {
        key: "reception_maribel",
        id: "seed_user_c3_reception_maribel",
        name: "Maribel Torres",
        email: "maribel.bellavista@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "reception",
        phone: "+1 809 555 0305",
        jobTitle: "Recepcionista",
        bio: "Recepcion de pacientes, agenda y comunicacion postconsulta.",
      },
      {
        key: "reception_keila",
        id: "seed_user_c3_reception_keila",
        name: "Keila Montero",
        email: "keila.bellavista@kiskeyavet.local",
        password: DEFAULT_PASSWORD,
        roleKey: "reception",
        phone: "+1 809 555 0306",
        jobTitle: "Asistente de caja",
        bio: "Apoya la gestion de turnos del dia y el seguimiento de pagos.",
      },
    ],
    services: [
      {
        key: "consulta_general",
        name: "Consulta general",
        category: "Consulta",
        description: "Evaluacion integral y seguimiento de pacientes ambulatorios.",
        durationMins: 30,
        price: 32,
      },
      {
        key: "vacunacion",
        name: "Vacunacion",
        category: "Preventivo",
        description: "Aplicacion de biologicos y carnet preventivo actualizado.",
        durationMins: 20,
        price: 24,
      },
      {
        key: "ecografia_abdominal",
        name: "Ecografia abdominal",
        category: "Diagnostico",
        description: "Tamizaje por imagen en tiempo real para control interno.",
        durationMins: 45,
        price: 70,
      },
      {
        key: "limpieza_dental",
        name: "Limpieza dental",
        category: "Odontologia",
        description: "Profilaxis dental con pulido y recomendaciones de cuidado oral.",
        durationMins: 80,
        price: 95,
      },
      {
        key: "grooming_premium",
        name: "Grooming premium",
        category: "Estetica",
        description: "Bano, corte, hidratacion de manto y perfume suave.",
        durationMins: 105,
        price: 42,
      },
      {
        key: "hospitalizacion_24h",
        name: "Hospitalizacion 24h",
        category: "Hospitalizacion",
        description: "Monitorizacion, fluidos y cuidado intensivo basico.",
        durationMins: 1440,
        price: 85,
      },
      {
        key: "analitica_basica",
        name: "Analitica basica",
        category: "Laboratorio",
        description: "Hemograma y quimica de apoyo para consulta clinica.",
        durationMins: 30,
        price: 48,
      },
      {
        key: "cirugia_tejidos_blandos",
        name: "Cirugia de tejidos blandos",
        category: "Cirugia",
        description: "Procedimientos planificados con monitoreo anestesico.",
        durationMins: 150,
        price: 190,
      },
    ],
    products: [
      {
        key: "vacuna_triple_felina",
        sku: "C3-BIO-001",
        name: "Vacuna triple felina",
        category: "Biologicos",
        unit: "dosis",
        cost: 13,
        price: 22,
        stockOnHand: 20,
        minStock: 6,
        description: "Biologico felino de refuerzo anual.",
        requiresPrescription: true,
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 24,
            reason: "Ingreso de biologicos felinos",
            createdByKey: "admin_valeria",
            daysOffset: -19,
          },
          {
            type: StockMovementType.SALE,
            quantity: 4,
            reason: "Aplicaciones recientes",
            createdByKey: "vet_julissa",
            daysOffset: -4,
          },
        ],
      },
      {
        key: "vacuna_leucemia",
        sku: "C3-BIO-002",
        name: "Vacuna leucemia felina",
        category: "Biologicos",
        unit: "dosis",
        cost: 14,
        price: 24,
        stockOnHand: 16,
        minStock: 5,
        description: "Refuerzo anual para gatos con acceso mixto o colonia.",
        requiresPrescription: true,
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 18,
            reason: "Compra preventiva",
            createdByKey: "admin_valeria",
            daysOffset: -18,
          },
          {
            type: StockMovementType.SALE,
            quantity: 2,
            reason: "Aplicadas en campaña del mes",
            createdByKey: "vet_adrian",
            daysOffset: -7,
          },
        ],
      },
      {
        key: "kit_dental",
        sku: "C3-ODO-001",
        name: "Kit dental veterinario",
        category: "Odontologia",
        unit: "kit",
        cost: 18,
        price: 32,
        stockOnHand: 10,
        minStock: 3,
        description: "Cepillo, pasta enzimica y guia de higiene oral.",
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 12,
            reason: "Ingreso para unidad dental",
            createdByKey: "admin_valeria",
            daysOffset: -22,
          },
          {
            type: StockMovementType.SALE,
            quantity: 2,
            reason: "Venta post profilaxis",
            createdByKey: "reception_keila",
            daysOffset: -11,
          },
        ],
      },
      {
        key: "gel_otico",
        sku: "C3-PHA-001",
        name: "Gel otico",
        category: "Farmacia",
        unit: "frasco",
        cost: 6,
        price: 14,
        stockOnHand: 14,
        minStock: 4,
        description: "Apoyo topico para control de otitis externa.",
        requiresPrescription: true,
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 18,
            reason: "Ingreso por alta rotacion",
            createdByKey: "admin_valeria",
            daysOffset: -16,
          },
          {
            type: StockMovementType.SALE,
            quantity: 4,
            reason: "Dispensado en consulta",
            createdByKey: "vet_adrian",
            daysOffset: -8,
          },
        ],
      },
      {
        key: "alimento_renal",
        sku: "C3-NUT-001",
        name: "Alimento renal 2 kg",
        category: "Nutricion",
        unit: "saco",
        cost: 21,
        price: 35,
        stockOnHand: 8,
        minStock: 3,
        description: "Dieta de soporte para pacientes con manejo renal.",
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 10,
            reason: "Pedido a distribuidor",
            createdByKey: "admin_valeria",
            daysOffset: -14,
          },
          {
            type: StockMovementType.SALE,
            quantity: 2,
            reason: "Venta a pacientes cronicamente controlados",
            createdByKey: "reception_maribel",
            daysOffset: -6,
          },
        ],
      },
      {
        key: "suero_rehidratante",
        sku: "C3-HOS-001",
        name: "Suero rehidratante 500 ml",
        category: "Hospitalizacion",
        unit: "bolsa",
        cost: 4,
        price: 9,
        stockOnHand: 22,
        minStock: 8,
        description: "Fluido isotonic o de mantenimiento para pacientes en observacion.",
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 26,
            reason: "Ingreso para sala de observacion",
            createdByKey: "admin_valeria",
            daysOffset: -20,
          },
          {
            type: StockMovementType.OUT,
            quantity: 4,
            reason: "Uso interno en pacientes febriles",
            createdByKey: "vet_adrian",
            daysOffset: -1,
          },
        ],
      },
      {
        key: "antiparasitario_gato",
        sku: "C3-PHA-002",
        name: "Antiparasitario spot-on felino",
        category: "Farmacia",
        unit: "pipeta",
        cost: 8,
        price: 15,
        stockOnHand: 18,
        minStock: 6,
        description: "Control externo felino de aplicacion mensual.",
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 22,
            reason: "Reposicion felina",
            createdByKey: "admin_valeria",
            daysOffset: -17,
          },
          {
            type: StockMovementType.SALE,
            quantity: 4,
            reason: "Venta en campana preventiva",
            createdByKey: "reception_keila",
            daysOffset: -3,
          },
        ],
      },
      {
        key: "analgesico_oral",
        sku: "C3-PHA-003",
        name: "Analgesico oral veterinario",
        category: "Farmacia",
        unit: "caja",
        cost: 11,
        price: 19,
        stockOnHand: 11,
        minStock: 4,
        description: "Soporte analgesico bajo indicacion medica.",
        requiresPrescription: true,
        movements: [
          {
            type: StockMovementType.PURCHASE,
            quantity: 15,
            reason: "Compra de rutina",
            createdByKey: "admin_valeria",
            daysOffset: -15,
          },
          {
            type: StockMovementType.SALE,
            quantity: 4,
            reason: "Dispensado postconsulta y postoperatorio",
            createdByKey: "vet_julissa",
            daysOffset: -10,
          },
        ],
      },
    ],
    vaccines: [
      {
        key: "triple_felina",
        name: "Triple felina",
        species: PetSpecies.CAT,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Esquema base para gatos adultos.",
      },
      {
        key: "leucemia_felina",
        name: "Leucemia felina",
        species: PetSpecies.CAT,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Refuerzo para pacientes con acceso al exterior.",
      },
      {
        key: "rabia_canina",
        name: "Rabia canina",
        species: PetSpecies.DOG,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Control anual obligatorio.",
      },
      {
        key: "sextuple_canina",
        name: "Sextuple canina",
        species: PetSpecies.DOG,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Proteccion central del esquema canino anual.",
      },
      {
        key: "bordetella",
        name: "Bordetella",
        species: PetSpecies.DOG,
        intervalValue: 1,
        intervalUnit: VaccineIntervalUnit.YEARS,
        notes: "Clave en pacientes sociales o de pension.",
      },
    ],
    clients: [
      {
        key: "lucia_ortega",
        fullName: "Lucia Ortega",
        phone: "+1 809 610 1201",
        email: "lucia.ortega@example.com",
        address: "Bella Vista, Santo Domingo",
        notes: "Busca horarios matutinos.",
        pets: [
          {
            key: "simona",
            name: "Simona",
            species: PetSpecies.DOG,
            breed: "Shih Tzu",
            sex: PetSex.FEMALE,
            color: "Miel",
            birthDate: "2022-02-11",
            microchip: "C3-SIMONA-0001",
            weightKg: 5.6,
            notes: "Control frecuente por piel sensible.",
          },
          {
            key: "oliver",
            name: "Oliver",
            species: PetSpecies.CAT,
            breed: "Persa",
            sex: PetSex.MALE,
            color: "Gris",
            birthDate: "2020-12-22",
            microchip: "C3-OLIVER-0002",
            weightKg: 4.9,
            notes: "Acumula placa dental con facilidad.",
          },
        ],
      },
      {
        key: "pedro_santana",
        fullName: "Pedro Santana",
        phone: "+1 809 610 1202",
        email: "pedro.santana@example.com",
        address: "Mirador Norte, Santo Domingo",
        notes: "Prefiere estados por llamada en urgencias.",
        pets: [
          {
            key: "moka",
            name: "Moka",
            species: PetSpecies.DOG,
            breed: "Yorkshire Terrier",
            sex: PetSex.FEMALE,
            color: "Negro y dorado",
            birthDate: "2023-01-16",
            microchip: "C3-MOKA-0003",
            weightKg: 3.2,
            notes: "Paciente nerviosa, manipular con calma.",
          },
        ],
      },
      {
        key: "yaritza_pena",
        fullName: "Yaritza Pena",
        phone: "+1 809 610 1203",
        email: "yaritza.pena@example.com",
        address: "Los Cacicazgos, Santo Domingo",
        notes: "Solicita resumen por correo luego de cada visita.",
        pets: [
          {
            key: "salem",
            name: "Salem",
            species: PetSpecies.CAT,
            breed: "Bombay",
            sex: PetSex.MALE,
            color: "Negro",
            birthDate: "2021-10-04",
            microchip: "C3-SALEM-0004",
            weightKg: 4.2,
            notes: "Paciente indoor con calendario preventivo completo.",
          },
        ],
      },
      {
        key: "ramon_acosta",
        fullName: "Ramon Acosta",
        phone: "+1 809 610 1204",
        email: "ramon.acosta@example.com",
        address: "Renacimiento, Santo Domingo",
        notes: "Autoriza procedimientos por llamada.",
        pets: [
          {
            key: "toby",
            name: "Toby",
            species: PetSpecies.DOG,
            breed: "Golden Retriever",
            sex: PetSex.MALE,
            color: "Dorado",
            birthDate: "2019-09-14",
            microchip: "C3-TOBY-0005",
            weightKg: 28.6,
            notes: "Seguimiento por dolor lumbar ocasional.",
          },
        ],
      },
      {
        key: "daniela_cruz",
        fullName: "Daniela Cruz",
        phone: "+1 809 610 1205",
        email: "daniela.cruz@example.com",
        address: "Bella Vista, Santo Domingo",
        notes: "Consulta por mensajes en horario laboral.",
        pets: [
          {
            key: "lola",
            name: "Lola",
            species: PetSpecies.RABBIT,
            breed: "Cabeza de leon",
            sex: PetSex.FEMALE,
            color: "Blanco y gris",
            birthDate: "2023-03-21",
            weightKg: 1.5,
            notes: "Control digestivo y corte de unas.",
          },
        ],
      },
      {
        key: "hector_diaz",
        fullName: "Hector Diaz",
        phone: "+1 809 610 1206",
        email: "hector.diaz@example.com",
        address: "Honduras del Oeste, Santo Domingo",
        notes: "Paciente activo con salidas diarias al parque.",
        pets: [
          {
            key: "ares",
            name: "Ares",
            species: PetSpecies.DOG,
            breed: "Bulldog frances",
            sex: PetSex.MALE,
            color: "Atigrado",
            birthDate: "2021-06-08",
            microchip: "C3-ARES-0006",
            weightKg: 12.1,
            notes: "Control respiratorio en epocas de calor.",
          },
        ],
      },
    ],
    appointments: [
      {
        key: "c3-appt-001",
        clientKey: "lucia_ortega",
        petKey: "simona",
        vetKey: "vet_adrian",
        type: AppointmentType.CONSULTATION,
        daysOffset: -12,
        hour: 9,
        durationMins: 35,
        status: AppointmentStatus.COMPLETED,
        reason: "Control dermatologico por prurito estacional.",
        notes: "Se recomienda bano medicado cada 10 dias.",
        reminderSent: true,
        visit: {
          weightKg: 5.7,
          temperatureC: 38.3,
          diagnosis: "Dermatitis superficial por sensibilidad estacional.",
          treatment: "Shampoo medicado y ajuste de antiparasitario externo.",
          notes: "Buena respuesta a tratamiento previo.",
        },
        invoice: {
          number: "C3-2026-0001",
          status: InvoiceStatus.PAID,
          issueDaysOffset: -12,
          dueDaysOffset: -12,
          lines: [
            { type: "service", ref: "consulta_general", quantity: 1 },
            { type: "product", ref: "gel_otico", quantity: 1 },
          ],
          payments: [
            {
              amount: 46,
              method: PaymentMethod.TRANSFER,
              reference: "TRX-C3-0001",
              daysOffset: -12,
            },
          ],
        },
      },
      {
        key: "c3-appt-002",
        clientKey: "lucia_ortega",
        petKey: "oliver",
        vetKey: "vet_julissa",
        type: AppointmentType.CHECKUP,
        daysOffset: -8,
        hour: 13,
        durationMins: 80,
        status: AppointmentStatus.COMPLETED,
        reason: "Limpieza dental preventiva por acumulacion de placa.",
        notes: "Paciente estable, sin extracciones necesarias.",
        reminderSent: true,
        visit: {
          weightKg: 4.9,
          temperatureC: 38.2,
          diagnosis: "Placa dental moderada sin enfermedad periodontal severa.",
          treatment: "Profilaxis dental y plan de higiene oral en casa.",
          notes: "Se entrega kit dental y control en 6 meses.",
          attachments: [
            {
              fileName: "oliver-dental.jpg",
              fileType: "image/jpeg",
              url: "https://files.kiskeyavet.local/c3/oliver-dental.jpg",
            },
          ],
        },
        invoice: {
          number: "C3-2026-0002",
          status: InvoiceStatus.PAID,
          issueDaysOffset: -8,
          dueDaysOffset: -8,
          lines: [
            { type: "service", ref: "limpieza_dental", quantity: 1 },
            { type: "product", ref: "kit_dental", quantity: 1 },
          ],
          payments: [
            {
              amount: 127,
              method: PaymentMethod.CARD,
              reference: "POS-C3-1002",
              daysOffset: -8,
            },
          ],
        },
      },
      {
        key: "c3-appt-003",
        clientKey: "pedro_santana",
        petKey: "moka",
        vetKey: "vet_adrian",
        type: AppointmentType.EMERGENCY,
        daysOffset: -1,
        hour: 17,
        durationMins: 50,
        status: AppointmentStatus.IN_PROGRESS,
        reason: "Vomitos y letargo desde la madrugada.",
        notes: "Paciente en observacion con fluidoterapia y analitica basica.",
        reminderSent: false,
      },
      {
        key: "c3-appt-004",
        clientKey: "yaritza_pena",
        petKey: "salem",
        vetKey: "vet_julissa",
        type: AppointmentType.VACCINATION,
        daysOffset: 2,
        hour: 10,
        durationMins: 20,
        status: AppointmentStatus.CONFIRMED,
        reason: "Refuerzo anual felino.",
        notes: "Confirmada por correo.",
        reminderSent: true,
      },
      {
        key: "c3-appt-005",
        clientKey: "ramon_acosta",
        petKey: "toby",
        vetKey: "vet_adrian",
        type: AppointmentType.HOSPITALIZATION,
        daysOffset: 1,
        hour: 8,
        durationMins: 180,
        status: AppointmentStatus.SCHEDULED,
        reason: "Observacion por dolor lumbar y ajuste de analgesia.",
        notes: "Traer estudios previos del fin de semana.",
      },
      {
        key: "c3-appt-006",
        clientKey: "daniela_cruz",
        petKey: "lola",
        vetKey: "vet_julissa",
        type: AppointmentType.DEWORMING,
        daysOffset: -5,
        hour: 11,
        durationMins: 25,
        status: AppointmentStatus.COMPLETED,
        reason: "Desparasitacion preventiva y revision digestiva.",
        notes: "Sin hallazgos de gravedad.",
        reminderSent: true,
        visit: {
          weightKg: 1.5,
          temperatureC: 39,
          diagnosis: "Paciente estable, sin alteraciones digestivas.",
          treatment: "Desparasitacion oral y control en 3 meses.",
          notes: "Se indican cuidados y observacion de apetito.",
        },
        invoice: {
          number: "C3-2026-0003",
          status: InvoiceStatus.PARTIALLY_PAID,
          issueDaysOffset: -5,
          dueDaysOffset: 5,
          lines: [
            { type: "service", ref: "consulta_general", quantity: 1 },
            { type: "custom", description: "Desparasitacion oral de conejo", quantity: 1, unitPrice: 12 },
          ],
          payments: [
            {
              amount: 20,
              method: PaymentMethod.CASH,
              daysOffset: -5,
            },
          ],
        },
      },
      {
        key: "c3-appt-007",
        clientKey: "hector_diaz",
        petKey: "ares",
        vetKey: "vet_adrian",
        type: AppointmentType.CONSULTATION,
        daysOffset: -3,
        hour: 15,
        durationMins: 30,
        status: AppointmentStatus.NO_SHOW,
        reason: "Control por ronquido y tolerancia al ejercicio.",
        notes: "No se presento a la hora pautada.",
        reminderSent: true,
      },
    ],
    todayTurns: [
      {
        clientKey: "pedro_santana",
        petKey: "moka",
        petName: "Moka",
        species: PetSpecies.DOG,
        ownerName: "Pedro Santana",
        ownerPhone: "+1 809 610 1202",
        type: AppointmentType.EMERGENCY,
        serviceName: "Observacion y fluidoterapia",
        notes: "Paciente continua en monitoreo.",
        hour: 8,
        estimatedDurationMins: 180,
        status: TodayTurnStatus.IN_PROGRESS,
      },
      {
        petName: "Mishi",
        species: PetSpecies.CAT,
        ownerName: "Rosa Valdez",
        ownerPhone: "+1 809 610 1290",
        type: AppointmentType.BATH,
        serviceName: "Bano seco felino",
        notes: "Nuevo cliente walk-in.",
        hour: 10,
        minute: 30,
        estimatedDurationMins: 55,
        status: TodayTurnStatus.WAITING,
      },
      {
        clientKey: "lucia_ortega",
        petKey: "simona",
        petName: "Simona",
        species: PetSpecies.DOG,
        ownerName: "Lucia Ortega",
        ownerPhone: "+1 809 610 1201",
        type: AppointmentType.GROOMING,
        serviceName: "Grooming premium",
        notes: "Lista para retiro despues del almuerzo.",
        hour: 9,
        minute: 15,
        estimatedDurationMins: 100,
        status: TodayTurnStatus.READY,
      },
    ],
    notifications: [
      {
        channel: NotificationChannel.WHATSAPP,
        status: NotificationStatus.SENT,
        title: "Recordatorio de vacunacion",
        message: "Salem tiene vacuna confirmada en 2 dias a las 10:00 AM en KiskeyaVet Bella Vista.",
        createdByKey: "reception_maribel",
        scheduledDaysOffset: 0,
        sentDaysOffset: 0,
        meta: { appointmentKey: "c3-appt-004", category: "preventive" },
        recipients: [
          {
            clientKey: "yaritza_pena",
            phone: "+1 809 610 1203",
            status: NotificationStatus.SENT,
            sentDaysOffset: 0,
          },
        ],
      },
      {
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.SENT,
        title: "Control dental senior",
        message: "Agenda limpieza dental preventiva para pacientes senior con evaluacion oral incluida.",
        createdByKey: "admin_valeria",
        scheduledDaysOffset: -4,
        sentDaysOffset: -4,
        meta: { segment: "dental-care", branch: "bellavista" },
        recipients: [
          {
            clientKey: "lucia_ortega",
            email: "lucia.ortega@example.com",
            status: NotificationStatus.SENT,
            sentDaysOffset: -4,
          },
          {
            clientKey: "hector_diaz",
            email: "hector.diaz@example.com",
            status: NotificationStatus.SENT,
            sentDaysOffset: -4,
          },
        ],
      },
      {
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.QUEUED,
        title: "Seguimiento de urgencia",
        message: "Moka permanece en observacion y requiere actualizacion de estado cada 2 horas.",
        createdByKey: "vet_adrian",
        meta: { appointmentKey: "c3-appt-003", urgency: "medium" },
        recipients: [
          {
            userKey: "owner_ricardo",
            status: NotificationStatus.QUEUED,
          },
          {
            userKey: "admin_valeria",
            status: NotificationStatus.QUEUED,
          },
        ],
      },
    ],
    invites: [
      {
        email: "soporte.bellavista@kiskeyavet.local",
        roleKey: "admin",
        createdByKey: "owner_ricardo",
        expiresInDays: 6,
      },
      {
        email: "groomer.bellavista@kiskeyavet.local",
        roleKey: "reception",
        createdByKey: "admin_valeria",
        expiresInDays: 8,
      },
    ],
  },
];

function money(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function withTime(daysOffset: number, hour: number, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return date;
}

function dateOnlyFromOffset(daysOffset: number) {
  const date = withTime(daysOffset, 0, 0);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function parseDateInput(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildInviteDisplayName(email: string) {
  const local = email.split("@")[0] ?? "pending.user";
  return titleCase(local.replace(/[._-]+/g, " "));
}

async function upsertSeedUser(tx: Prisma.TransactionClient, user: SeedUser) {
  const passwordHash = await bcrypt.hash(user.password, 10);

  const dbUser = await tx.user.upsert({
    where: { email: user.email },
    update: {
      name: user.name,
      emailVerified: true,
      role: user.roleKey,
      banned: false,
      banReason: null,
      banExpires: null,
    },
    create: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
      role: user.roleKey,
      banned: false,
      banReason: null,
      banExpires: null,
    },
  });

  await tx.account.deleteMany({
    where: {
      userId: dbUser.id,
      providerId: { in: ["credential", "credentials"] },
    },
  });

  await tx.account.create({
    data: {
      id: `acct_${dbUser.id}_credential`,
      accountId: dbUser.id,
      providerId: "credential",
      userId: dbUser.id,
      password: passwordHash,
    },
  });

  await tx.userProfile.upsert({
    where: { userId: dbUser.id },
    update: {
      phone: user.phone ?? null,
      jobTitle: user.jobTitle ?? null,
      bio: user.bio ?? null,
    },
    create: {
      userId: dbUser.id,
      phone: user.phone ?? null,
      jobTitle: user.jobTitle ?? null,
      bio: user.bio ?? null,
    },
  });

  return dbUser;
}

async function upsertPendingInviteUser(
  tx: Prisma.TransactionClient,
  clinicCode: string,
  email: string,
) {
  const passwordHash = await bcrypt.hash(INVITE_PASSWORD, 10);

  const dbUser = await tx.user.upsert({
    where: { email },
    update: {
      name: buildInviteDisplayName(email),
      emailVerified: false,
      role: null,
      banned: false,
      banReason: null,
      banExpires: null,
    },
    create: {
      id: `seed_invite_${clinicCode.toLowerCase()}_${hashToken(email).slice(0, 16)}`,
      name: buildInviteDisplayName(email),
      email,
      emailVerified: false,
      role: null,
      banned: false,
      banReason: null,
      banExpires: null,
    },
  });

  await tx.account.deleteMany({
    where: {
      userId: dbUser.id,
      providerId: { in: ["credential", "credentials"] },
    },
  });

  await tx.account.create({
    data: {
      id: `acct_${dbUser.id}_credential`,
      accountId: dbUser.id,
      providerId: "credential",
      userId: dbUser.id,
      password: passwordHash,
    },
  });

  return dbUser;
}

async function createInvoiceForAppointment(
  tx: Prisma.TransactionClient,
  clinicId: number,
  createdById: string,
  clientId: number,
  petId: number,
  appointmentId: number,
  invoiceSeed: InvoiceSeed,
  serviceMap: Map<string, { id: number; price: number; name: string }>,
  productMap: Map<string, { id: number; price: number; name: string }>,
) {
  const resolvedLines = invoiceSeed.lines.map((line) => {
    if (line.type === "service") {
      const service = line.ref ? serviceMap.get(line.ref) : null;
      if (!service) {
        throw new Error(`Missing service ${line.ref ?? "unknown"} for clinic ${clinicId}`);
      }

      return {
        type: InvoiceItemType.SERVICE,
        serviceId: service.id,
        productId: null,
        description: line.description ?? service.name,
        quantity: line.quantity,
        unitPrice: service.price,
        taxRate: line.taxRate ?? 0,
      };
    }

    if (line.type === "product") {
      const product = line.ref ? productMap.get(line.ref) : null;
      if (!product) {
        throw new Error(`Missing product ${line.ref ?? "unknown"} for clinic ${clinicId}`);
      }

      return {
        type: InvoiceItemType.PRODUCT,
        serviceId: null,
        productId: product.id,
        description: line.description ?? product.name,
        quantity: line.quantity,
        unitPrice: product.price,
        taxRate: line.taxRate ?? 0,
      };
    }

    if (line.unitPrice == null || !line.description) {
      throw new Error(`Custom invoice line requires description and unitPrice for ${invoiceSeed.number}`);
    }

    return {
      type: InvoiceItemType.CUSTOM,
      serviceId: null,
      productId: null,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate ?? 0,
    };
  });

  const subtotalNumber = resolvedLines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const taxNumber = invoiceSeed.tax ?? 0;
  const discountNumber = invoiceSeed.discount ?? 0;
  const totalNumber = subtotalNumber + taxNumber - discountNumber;

  const paidAmountNumber =
    invoiceSeed.payments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;

  const invoice = await tx.invoice.create({
    data: {
      clinicId,
      clientId,
      petId,
      appointmentId,
      number: invoiceSeed.number,
      status: invoiceSeed.status,
      issueDate: withTime(invoiceSeed.issueDaysOffset, 9, 0),
      dueDate:
        invoiceSeed.dueDaysOffset == null ? null : withTime(invoiceSeed.dueDaysOffset, 18, 0),
      paidAt:
        paidAmountNumber >= totalNumber && paidAmountNumber > 0
          ? withTime(invoiceSeed.issueDaysOffset, 18, 0)
          : null,
      subtotal: money(subtotalNumber),
      tax: money(taxNumber),
      discount: money(discountNumber),
      total: money(totalNumber),
      notes: invoiceSeed.notes ?? null,
      createdById,
    },
  });

  for (const line of resolvedLines) {
    await tx.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        type: line.type,
        serviceId: line.serviceId,
        productId: line.productId,
        description: line.description,
        quantity: money(line.quantity),
        unitPrice: money(line.unitPrice),
        taxRate: money(line.taxRate),
        lineTotal: money(line.quantity * line.unitPrice),
      },
    });
  }

  for (const payment of invoiceSeed.payments ?? []) {
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: money(payment.amount),
        method: payment.method,
        reference: payment.reference ?? null,
        paidAt: withTime(payment.daysOffset, 16, 30),
        createdById,
      },
    });
  }

  return invoice;
}

async function seedClinic(tx: Prisma.TransactionClient, clinic: ClinicSeed) {
  const createdClinic = await tx.clinic.create({
    data: {
      id: clinic.id,
      name: clinic.name,
      phone: clinic.phone,
      email: clinic.email,
      address: clinic.address,
      currency: clinic.currency,
      timezone: clinic.timezone,
      slogan: clinic.slogan,
      owner: clinic.owner,
      mobile: clinic.mobile,
      website: clinic.website,
      taxName: clinic.taxName,
      taxId: clinic.taxId,
      bankName: clinic.bankName,
      bankAccount: clinic.bankAccount,
      bankClabe: clinic.bankClabe,
      invoiceNotes: clinic.invoiceNotes,
      invoiceTerms: clinic.invoiceTerms,
      socialMedia: clinic.socialMedia,
      isActive: true,
      subscriptionStatus: clinic.subscriptionStatus,
      subscriptionEndDate: dateOnlyFromOffset(clinic.subscriptionEndDate),
      plan: clinic.plan,
    },
  });

  const roleMap = new Map<RoleKey, { id: number; key: RoleKey }>();
  for (const role of ROLE_DEFINITIONS) {
    const createdRole = await tx.role.create({
      data: {
        clinicId: createdClinic.id,
        key: role.key,
        name: role.name,
        description: role.description,
        permissions: role.permissions as Prisma.InputJsonValue,
        isActive: true,
        isSystem: true,
      },
      select: { id: true, key: true },
    });

    roleMap.set(createdRole.key as RoleKey, createdRole as { id: number; key: RoleKey });
  }

  await tx.clinicSchedule.createMany({
    data: DEFAULT_SCHEDULE.map((schedule) => ({
      clinicId: createdClinic.id,
      day: schedule.day,
      open: schedule.open,
      close: schedule.close,
      closed: schedule.closed,
    })),
  });

  const userMap = new Map<string, { id: string; name: string; email: string }>();
  for (const user of clinic.users) {
    const dbUser = await upsertSeedUser(tx, user);
    const role = roleMap.get(user.roleKey as RoleKey);

    if (!role) {
      throw new Error(`Role ${user.roleKey} not found for clinic ${clinic.id}`);
    }

    await tx.clinicMember.create({
      data: {
        clinicId: createdClinic.id,
        userId: dbUser.id,
        roleId: role.id,
        isActive: true,
      },
    });

    userMap.set(user.key, {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
    });
  }

  for (const invite of clinic.invites) {
    const role = roleMap.get(invite.roleKey);
    const createdBy = userMap.get(invite.createdByKey);

    if (!role || !createdBy) {
      throw new Error(`Invite references missing role or user in clinic ${clinic.id}`);
    }

    const invitedUser = await upsertPendingInviteUser(tx, clinic.code, invite.email);

    await tx.clinicMember.create({
      data: {
        clinicId: createdClinic.id,
        userId: invitedUser.id,
        roleId: role.id,
        isActive: false,
      },
    });

    await tx.employeeInvite.create({
      data: {
        clinicId: createdClinic.id,
        email: invite.email,
        roleId: role.id,
        userId: invitedUser.id,
        tokenHash: hashToken(`${clinic.code}:${invite.email}`),
        expiresAt: withTime(invite.expiresInDays, 23, 59),
        acceptedAt: null,
        createdById: createdBy.id,
      },
    });
  }

  const serviceMap = new Map<string, { id: number; price: number; name: string }>();
  for (const service of clinic.services) {
    const createdService = await tx.service.create({
      data: {
        clinicId: createdClinic.id,
        name: service.name,
        category: service.category,
        description: service.description,
        durationMins: service.durationMins,
        price: money(service.price),
        isActive: true,
      },
      select: { id: true, name: true },
    });

    serviceMap.set(service.key, {
      id: createdService.id,
      price: service.price,
      name: createdService.name,
    });
  }

  const productMap = new Map<string, { id: number; price: number; name: string }>();
  for (const product of clinic.products) {
    const createdProduct = await tx.product.create({
      data: {
        clinicId: createdClinic.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit: product.unit,
        cost: money(product.cost),
        price: money(product.price),
        trackStock: true,
        stockOnHand: product.stockOnHand,
        minStock: product.minStock,
        isActive: true,
        description: product.description,
        requiresPrescription: product.requiresPrescription ?? false,
      },
      select: { id: true, name: true },
    });

    productMap.set(product.key, {
      id: createdProduct.id,
      price: product.price,
      name: createdProduct.name,
    });

    for (const movement of product.movements) {
      const createdBy = userMap.get(movement.createdByKey);
      if (!createdBy) {
        throw new Error(`Stock movement references unknown user ${movement.createdByKey}`);
      }

      await tx.stockMovement.create({
        data: {
          clinicId: createdClinic.id,
          productId: createdProduct.id,
          type: movement.type,
          quantity: movement.quantity,
          reason: movement.reason,
          referenceType: movement.referenceType ?? null,
          referenceId: movement.referenceId ?? null,
          createdById: createdBy.id,
          createdAt: withTime(movement.daysOffset, 11, 0),
        },
      });
    }
  }

  const vaccineMap = new Map<string, { id: number; name: string }>();
  for (const vaccine of clinic.vaccines) {
    const createdVaccine = await tx.vaccineCatalog.create({
      data: {
        clinicId: createdClinic.id,
        name: vaccine.name,
        species: vaccine.species,
        intervalValue: vaccine.intervalValue,
        intervalUnit: vaccine.intervalUnit,
        notes: vaccine.notes ?? null,
        isActive: true,
      },
      select: { id: true, name: true },
    });

    vaccineMap.set(vaccine.key, {
      id: createdVaccine.id,
      name: createdVaccine.name,
    });
  }

  const clientMap = new Map<
    string,
    { id: number; fullName: string; phone: string | null; email: string | null }
  >();
  const petMap = new Map<string, { id: number; name: string; clientId: number }>();

  for (const client of clinic.clients) {
    const createdClient = await tx.client.create({
      data: {
        clinicId: createdClinic.id,
        fullName: client.fullName,
        phone: client.phone,
        email: client.email ?? null,
        address: client.address ?? null,
        notes: client.notes ?? null,
      },
      select: { id: true, fullName: true, phone: true, email: true },
    });

    clientMap.set(client.key, createdClient);

    for (const pet of client.pets) {
      const createdPet = await tx.pet.create({
        data: {
          clinicId: createdClinic.id,
          clientId: createdClient.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed ?? null,
          sex: pet.sex,
          color: pet.color ?? null,
          birthDate: parseDateInput(pet.birthDate),
          microchip: pet.microchip ?? null,
          weightKg: pet.weightKg ?? null,
          notes: pet.notes ?? null,
        },
        select: { id: true, name: true, clientId: true },
      });

      petMap.set(pet.key, createdPet);
    }
  }

  for (const appointment of clinic.appointments) {
    const client = clientMap.get(appointment.clientKey);
    const pet = petMap.get(appointment.petKey);
    const vet = appointment.vetKey ? userMap.get(appointment.vetKey) : null;

    if (!client || !pet) {
      throw new Error(`Appointment ${appointment.key} references missing client or pet.`);
    }

    const startAt = withTime(appointment.daysOffset, appointment.hour, appointment.minute ?? 0);
    const createdBy = vet ?? userMap.get("admin_laura") ?? userMap.get("admin_valeria");

    if (!createdBy) {
      throw new Error(`Unable to resolve creator for appointment ${appointment.key}`);
    }

    const createdAppointment = await tx.appointment.create({
      data: {
        clinicId: createdClinic.id,
        clientId: client.id,
        petId: pet.id,
        type: appointment.type,
        startAt,
        endAt: addMinutes(startAt, appointment.durationMins),
        status: appointment.status,
        reason: appointment.reason,
        notes: appointment.notes ?? null,
        reminderSent: appointment.reminderSent ?? false,
        reminderSentAt: appointment.reminderSent ? addMinutes(startAt, -90) : null,
        vetId: vet?.id ?? null,
      },
      select: { id: true },
    });

    let createdVisitId: number | null = null;
    if (appointment.visit) {
      const visit = await tx.clinicalVisit.create({
        data: {
          clinicId: createdClinic.id,
          clientId: client.id,
          petId: pet.id,
          appointmentId: createdAppointment.id,
          vetId: vet?.id ?? null,
          visitAt: addMinutes(startAt, 10),
          weightKg: appointment.visit.weightKg ?? null,
          temperatureC: appointment.visit.temperatureC ?? null,
          diagnosis: appointment.visit.diagnosis ?? null,
          treatment: appointment.visit.treatment ?? null,
          notes: appointment.visit.notes ?? null,
        },
        select: { id: true },
      });

      createdVisitId = visit.id;

      for (const attachment of appointment.visit.attachments ?? []) {
        await tx.medicalAttachment.create({
          data: {
            clinicId: createdClinic.id,
            visitId: visit.id,
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            url: attachment.url,
          },
        });
      }

      for (const vaccination of appointment.visit.vaccinations ?? []) {
        const vaccine = vaccineMap.get(vaccination.vaccineKey);
        if (!vaccine) {
          throw new Error(`Vaccination references unknown vaccine ${vaccination.vaccineKey}`);
        }

        await tx.vaccinationRecord.create({
          data: {
            clinicId: createdClinic.id,
            petId: pet.id,
            vaccineId: vaccine.id,
            visitId: visit.id,
            appliedAt: withTime(vaccination.appliedDaysOffset, 15, 0),
            nextDueAt:
              vaccination.nextDueDaysOffset == null
                ? null
                : withTime(vaccination.nextDueDaysOffset, 9, 0),
            batchNumber: vaccination.batchNumber ?? null,
            notes: vaccination.notes ?? null,
          },
        });
      }
    }

    if (appointment.invoice) {
      await createInvoiceForAppointment(
        tx,
        createdClinic.id,
        createdBy.id,
        client.id,
        pet.id,
        createdAppointment.id,
        appointment.invoice,
        serviceMap,
        productMap,
      );
    }

    if (!createdVisitId && appointment.status === AppointmentStatus.COMPLETED) {
      await tx.notification.create({
        data: {
          clinicId: createdClinic.id,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
          title: "Servicio completado",
          message: `${pet.name} completo el servicio ${appointment.type.toLowerCase()}.`,
          createdById: createdBy.id,
          sentAt: addMinutes(startAt, appointment.durationMins),
          recipients: {
            create: {
              clientId: client.id,
              phone: client.phone,
              email: client.email,
              status: NotificationStatus.SENT,
              sentAt: addMinutes(startAt, appointment.durationMins),
            },
          },
        },
      });
    }
  }

  for (const turn of clinic.todayTurns) {
    const client = turn.clientKey ? clientMap.get(turn.clientKey) : null;
    const pet = turn.petKey ? petMap.get(turn.petKey) : null;

    await tx.todayTurn.create({
      data: {
        clinicId: createdClinic.id,
        clientId: client?.id ?? null,
        petId: pet?.id ?? null,
        petName: turn.petName,
        species: turn.species,
        ownerName: turn.ownerName,
        ownerPhone: turn.ownerPhone,
        type: turn.type,
        serviceName: turn.serviceName,
        notes: turn.notes ?? null,
        arrivalAt: withTime(0, turn.hour, turn.minute ?? 0),
        estimatedDurationMins: turn.estimatedDurationMins,
        status: turn.status,
        notifiedAt:
          turn.status === TodayTurnStatus.READY ? withTime(0, turn.hour + 1, turn.minute ?? 0) : null,
      },
    });
  }

  for (const notification of clinic.notifications) {
    const createdBy = userMap.get(notification.createdByKey);
    if (!createdBy) {
      throw new Error(`Notification creator ${notification.createdByKey} was not found`);
    }

    const createdNotification = await tx.notification.create({
      data: {
        clinicId: createdClinic.id,
        channel: notification.channel,
        status: notification.status,
        title: notification.title,
        message: notification.message,
        scheduledAt:
          notification.scheduledDaysOffset == null
            ? null
            : withTime(notification.scheduledDaysOffset, 8, 30),
        sentAt:
          notification.sentDaysOffset == null ? null : withTime(notification.sentDaysOffset, 8, 45),
        meta: notification.meta ?? undefined,
        createdById: createdBy.id,
      },
      select: { id: true },
    });

    for (const recipient of notification.recipients) {
      const user = recipient.userKey ? userMap.get(recipient.userKey) : null;
      const client = recipient.clientKey ? clientMap.get(recipient.clientKey) : null;

      await tx.notificationRecipient.create({
        data: {
          notificationId: createdNotification.id,
          userId: user?.id ?? null,
          clientId: client?.id ?? null,
          email: recipient.email ?? client?.email ?? user?.email ?? null,
          phone: recipient.phone ?? client?.phone ?? null,
          status: recipient.status,
          sentAt:
            recipient.sentDaysOffset == null ? null : withTime(recipient.sentDaysOffset, 8, 45),
        },
      });
    }
  }

  const ownerUser =
    clinic.users.find((user) => user.roleKey === "owner")?.key ??
    clinic.users[0]?.key;
  const owner = ownerUser ? userMap.get(ownerUser) : null;

  if (owner) {
    await tx.pushSubscription.create({
      data: {
        clinicId: createdClinic.id,
        userId: owner.id,
        endpoint: `https://push.kiskeyavet.local/subscriptions/${clinic.code.toLowerCase()}`,
        p256dh: `p256dh-${clinic.code.toLowerCase()}-seed`,
        auth: `auth-${clinic.code.toLowerCase()}-seed`,
        userAgent: "SeedAgent/1.0",
      },
    });
  }
}

async function main() {
  const seedUsers = [SUPERADMIN, ...CLINICS.flatMap((clinic) => clinic.users)];
  const clinicIds = CLINICS.map((clinic) => clinic.id);

  await prisma.$transaction(async (tx) => {
    for (const user of seedUsers) {
      await upsertSeedUser(tx, user);
    }

    await tx.employeeInvite.deleteMany({
      where: { clinicId: { in: clinicIds } },
    });

    await tx.clinicMember.deleteMany({
      where: { clinicId: { in: clinicIds } },
    });

    await tx.role.deleteMany({
      where: { clinicId: { in: clinicIds } },
    });

    await tx.clinic.deleteMany({
      where: { id: { in: clinicIds } },
    });

    for (const clinic of CLINICS) {
      await seedClinic(tx, clinic);
    }
  });

  console.log("Seed completado con exito.");
  console.log(
    JSON.stringify(
      {
        clinics: CLINICS.map((clinic) => ({
          id: clinic.id,
          name: clinic.name,
          users: clinic.users.map((user) => ({
            role: user.roleKey,
            email: user.email,
            password: user.password,
          })),
        })),
        superadmin: {
          email: SUPERADMIN.email,
          password: SUPERADMIN.password,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
