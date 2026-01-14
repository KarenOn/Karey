// src/types/vetcare.ts

/**
 * Types para FRONTEND/APP (serializados)
 * - DateTime = string ISO (ej: "2026-01-11T12:34:56.000Z")
 * - Money/Decimal = number (en server conviertes Prisma.Decimal -> number)
 */

export type ID = number;
export type DateTime = string;
export type Money = number;

/**
 * =========================
 * ENUMS
 * =========================
 */

export type ClinicRole = "OWNER" | "ADMIN" | "VET" | "RECEPTION";

export type PetSpecies = "DOG" | "CAT" | "BIRD" | "RABBIT" | "OTHER";
export type PetSex = "MALE" | "FEMALE" | "UNKNOWN";

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "VOID";

export type InvoiceItemType = "SERVICE" | "PRODUCT" | "CUSTOM";

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "OTHER";

export type StockMovementType =
  | "IN"
  | "OUT"
  | "ADJUST"
  | "SALE"
  | "PURCHASE"
  | "EXPIRED";

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";

export type NotificationStatus = "QUEUED" | "SENT" | "FAILED" | "CANCELLED";

export type VaccineIntervalUnit = "DAYS" | "WEEKS" | "MONTHS" | "YEARS";

/**
 * =========================
 * BETTER AUTH MODELS
 * (mapeados como en schema.prisma)
 * =========================
 */

export interface AuthUser {
  id: ID;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface AuthSession {
  id: ID;
  expiresAt: DateTime;
  token: string;
  createdAt: DateTime;
  updatedAt: DateTime;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId: ID;
}

export interface AuthAccount {
  id: ID;
  accountId: string;
  providerId: string;
  userId: ID;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  accessTokenExpiresAt?: DateTime | null;
  refreshTokenExpiresAt?: DateTime | null;
  scope?: string | null;
  password?: string | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface AuthVerification {
  id: ID;
  identifier: string;
  value: string;
  expiresAt: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
}

/**
 * =========================
 * CORE
 * =========================
 */

export interface Clinic {
  id: ID;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  currency: string; // "USD" | "DOP"...
  timezone: string; // "America/Santo_Domingo"...
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface ClinicMember {
  id: ID;
  clinicId: ID;
  userId: ID;
  role: ClinicRole;
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

/**
 * =========================
 * CLIENTES / PETS
 * =========================
 */

export interface Client {
  id: ID;
  clinicId: ID;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface Pet {
  id: ID;
  clinicId: ID;
  clientId: ID;
  name: string;
  species: PetSpecies;
  breed?: string | null;
  sex: PetSex;
  color?: string | null;
  birthDate?: DateTime | null;
  microchip?: string | null;
  weightKg?: number | null;
  notes?: string | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

/**
 * =========================
 * CITAS / AGENDA
 * =========================
 */

export interface Appointment {
  id: ID;
  clinicId: ID;
  clientId: ID;
  petId: ID;
  startAt: DateTime;
  endAt?: DateTime | null;
  status: AppointmentStatus;
  reason?: string | null;
  notes?: string | null;

  vetId?: ID | null;

  createdAt: DateTime;
  updatedAt: DateTime;
}

/**
 * =========================
 * SERVICIOS
 * =========================
 */

export interface Service {
  id: ID;
  clinicId: ID;
  name: string;
  description?: string | null;
  durationMins?: number | null;
  price: Money;
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

/**
 * =========================
 * INVENTARIO
 * =========================
 */

export interface Product {
  id: ID;
  clinicId: ID;
  sku?: string | null;
  name: string;
  category?: string | null;
  unit?: string | null;

  cost?: Money | null;
  price?: Money | null;

  trackStock: boolean;
  stockOnHand: number;
  minStock: number;

  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface StockMovement {
  id: ID;
  clinicId: ID;
  productId: ID;
  type: StockMovementType;

  quantity: number;
  reason?: string | null;

  referenceType?: string | null;
  referenceId?: string | null;

  createdById?: ID | null;
  createdAt: DateTime;
}

/**
 * =========================
 * FACTURACIÓN
 * =========================
 */

export interface Invoice {
  id: ID;
  clinicId: ID;
  clientId: ID;

  petId?: ID | null;
  appointmentId?: ID | null;

  number: string;
  status: InvoiceStatus;

  issueDate: DateTime;
  dueDate?: DateTime | null;
  paidAt?: DateTime | null;

  subtotal: Money;
  tax: Money;
  discount: Money;
  total: Money;

  notes?: string | null;

  createdById?: ID | null;

  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface InvoiceItem {
  id: ID;
  invoiceId: ID;
  type: InvoiceItemType;

  serviceId?: ID | null;
  productId?: ID | null;

  description: string;

  quantity: number; // decimal serializado
  unitPrice: Money;
  taxRate: number; // % ej 18.00
  lineTotal: Money;

  createdAt: DateTime;
}

export interface Payment {
  id: ID;
  invoiceId: ID;
  amount: Money;
  method: PaymentMethod;
  reference?: string | null;
  paidAt: DateTime;
  createdById?: ID | null;
}

/**
 * =========================
 * HISTORIAL CLÍNICO
 * =========================
 */

export interface ClinicalVisit {
  id: ID;
  clinicId: ID;
  clientId: ID;
  petId: ID;

  appointmentId?: ID | null;
  vetId?: ID | null;

  visitAt: DateTime;

  weightKg?: number | null;
  temperatureC?: number | null;

  diagnosis?: string | null;
  treatment?: string | null;
  notes?: string | null;

  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface MedicalAttachment {
  id: ID;
  clinicId: ID;
  visitId: ID;
  fileName: string;
  fileType?: string | null;
  url: string;
  createdAt: DateTime;
}

/**
 * =========================
 * VACUNAS
 * =========================
 */

export interface VaccineCatalog {
  id: ID;
  clinicId: ID;
  name: string;
  species?: PetSpecies | null;

  intervalValue?: number | null; // ej 15
  intervalUnit?: VaccineIntervalUnit | null; // ej "DAYS"

  notes?: string | null;
  isActive: boolean;

  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface VaccinationRecord {
  id: ID;
  clinicId: ID;
  petId: ID;
  vaccineId: ID;

  visitId?: ID | null;

  appliedAt: DateTime;
  nextDueAt?: DateTime | null;

  batchNumber?: string | null;
  notes?: string | null;

  createdAt: DateTime;
}

/**
 * =========================
 * NOTIFICACIONES
 * =========================
 */

export interface Notification {
  id: ID;
  clinicId: ID;

  channel: NotificationChannel;
  status: NotificationStatus;

  title: string;
  message: string;

  scheduledAt?: DateTime | null;
  sentAt?: DateTime | null;

  error?: string | null;
  meta?: Record<string, unknown> | null;

  createdById?: ID | null;
  createdAt: DateTime;
}

export interface NotificationRecipient {
  id: ID;
  notificationId: ID;

  userId?: ID | null;
  clientId?: ID | null;

  email?: string | null;
  phone?: string | null;

  status: NotificationStatus;
  sentAt?: DateTime | null;
  error?: string | null;
}

/**
 * =========================
 * "POPULATED" / VIEW TYPES (útiles para UI)
 * =========================
 */

export type ClientLite = Pick<Client, "id" | "fullName" | "phone" | "email">;

export type PetLite = Pick<Pet, "id" | "name" | "species" | "breed" | "clientId">;

export type AppointmentWithPetAndClient = Appointment & {
  pet?: Pick<Pet, "id" | "name"> | null;
  client?: Pick<Client, "id" | "fullName"> | null;
};

export type InvoiceWithClient = Invoice & {
  client?: Pick<Client, "id" | "fullName"> | null;
};

export type VaccinationUpcomingView = {
  id: ID;
  petId: ID;
  petName: string;
  clientName: string;
  vaccineName: string;
  nextDueAt: DateTime | null;
  appliedAt: DateTime;
};

/**
 * =========================
 * DASHBOARD DTO (si quieres props “listos”)
 * =========================
 */

export interface DashboardClientDTO {
  id: ID;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface DashboardPatientDTO {
  id: ID;
  name: string;
  client_id: ID;
  species: PetSpecies;
  breed?: string | null;
}

export interface DashboardAppointmentDTO {
  id: ID;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  status: AppointmentStatus;
  reason: string;
  notes: string;
  patient_id: ID;
  client_id: ID;
  patient_name: string;
  client_name: string;
}

export interface DashboardInvoiceDTO {
  id: ID;
  number: string;
  status: InvoiceStatus;
  date: string; // yyyy-MM-dd
  total: Money;
  client_id: ID;
  client_name: string;
}

export interface DashboardLowStockProductDTO {
  id: ID;
  sku?: string | null;
  name: string;
  category?: string | null;
  stockOnHand: number;
  minStock: number;
}

export interface DashboardVaccinationDTO {
  id: ID;
  pet_id: ID;
  pet_name: string;
  client_name: string;
  vaccine_name: string;
  next_due_at: string | null; // yyyy-MM-dd
  applied_at: string; // yyyy-MM-dd
}

export interface DashboardDataDTO {
  clinicName: string;
  clients: DashboardClientDTO[];
  patients: DashboardPatientDTO[];
  appointments: DashboardAppointmentDTO[];
  upcomingAppointments: DashboardAppointmentDTO[];
  invoices: DashboardInvoiceDTO[];
  products: DashboardLowStockProductDTO[];
  vaccinations: DashboardVaccinationDTO[];
  todayAppointmentsCount: number;
  monthlyRevenue: Money;
}
