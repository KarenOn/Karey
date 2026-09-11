import "server-only";

import { InvoiceStatus, NotificationChannel, NotificationStatus } from "@/generated/prisma/client";
import { hasAnyPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type NotificationInput = {
  clinicId: number;
  eventKey: string;
  type: string;
  title: string;
  message: string;
  targetUrl?: string | null;
  userIds: string[];
};

async function createInAppNotification(input: NotificationInput) {
  const userIds = [...new Set(input.userIds.filter(Boolean))];
  if (!userIds.length) return false;

  try {
    await prisma.notification.create({
      data: {
        clinicId: input.clinicId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        type: input.type,
        eventKey: input.eventKey,
        title: input.title,
        message: input.message,
        targetUrl: input.targetUrl ?? null,
        sentAt: new Date(),
        recipients: {
          create: userIds.map((userId) => ({ userId, status: NotificationStatus.SENT, sentAt: new Date() })),
        },
      },
    });
    return true;
  } catch (error) {
    // A repeated trigger may race with another request. The unique event key is the guard.
    if ((error as { code?: string })?.code === "P2002") return false;
    throw error;
  }
}

async function getMembersWithPermission(clinicId: number, permissions: string[]) {
  const members = await prisma.clinicMember.findMany({
    where: { clinicId, isActive: true, role: { is: { isActive: true } } },
    select: { userId: true, role: { select: { key: true, permissions: true } } },
  });
  return members.filter((member) => hasAnyPermission(member.role.permissions, permissions));
}

async function getAdminIds(clinicId: number) {
  const members = await prisma.clinicMember.findMany({
    where: { clinicId, isActive: true, role: { is: { isActive: true, key: { in: ["owner", "admin"] } } } },
    select: { userId: true },
  });
  return members.map((member) => member.userId);
}

async function getGlobalAdminIds(excludeUserId?: string) {
  const users = await prisma.user.findMany({ where: { role: "superadmin", ...(excludeUserId ? { id: { not: excludeUserId } } : {}) }, select: { id: true } });
  return users.map((user) => user.id);
}

export async function notifyClinicCreated(params: { clinicId: number; clinicName: string; createdByUserId?: string | null }) {
  await createInAppNotification({
    clinicId: params.clinicId,
    eventKey: `clinic-created:${params.clinicId}`,
    type: "CLINIC_CREATED",
    title: "Nueva clínica registrada",
    message: `Se creó la clínica ${params.clinicName}.`,
    targetUrl: "/admin/clinics",
    userIds: await getGlobalAdminIds(params.createdByUserId ?? undefined),
  });
}

export async function notifyAppointmentAssigned(params: { appointmentId: number; assignedVetId: string; assignedByUserId: string; selfAssigned?: boolean }) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    select: { id: true, clinicId: true, startAt: true, pet: { select: { name: true } }, vet: { select: { name: true } } },
  });
  if (!appointment) return;

  const time = new Intl.DateTimeFormat("es-DO", { hour: "numeric", minute: "2-digit" }).format(appointment.startAt);
  const date = new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "long" }).format(appointment.startAt);
  if (params.selfAssigned) {
    await createInAppNotification({
      clinicId: appointment.clinicId,
      eventKey: `appointment-self-assigned:${appointment.id}:${params.assignedVetId}`,
      type: "APPOINTMENT_SELF_ASSIGNED",
      title: "Cita tomada",
      message: `${appointment.vet?.name ?? "Un veterinario"} tomó la cita de ${appointment.pet.name}.`,
      targetUrl: `/appointments?appointment=${appointment.id}`,
      userIds: await getAdminIds(appointment.clinicId),
    });
    return;
  }

  await createInAppNotification({
    clinicId: appointment.clinicId,
    eventKey: `appointment-assigned:${appointment.id}:${params.assignedVetId}`,
    type: "APPOINTMENT_ASSIGNED",
    title: "Nueva cita asignada",
    message: `Se te asignó una cita con ${appointment.pet.name} para el ${date} a las ${time}.`,
    targetUrl: `/appointments?appointment=${appointment.id}`,
    userIds: [params.assignedVetId],
  });
}

export async function notifyInvoiceEvent(invoiceId: number, event: "DRAFT" | "ISSUED" | "PARTIAL_PAYMENT" | "PAID") {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, clinicId: true, number: true, total: true, status: true, client: { select: { fullName: true } }, pet: { select: { name: true } } },
  });
  if (!invoice) return;

  const permissionMap = {
    DRAFT: ["invoices.viewDrafts", "invoices.sendToBilling"],
    ISSUED: ["invoices.issue"],
    PARTIAL_PAYMENT: ["payments.register"],
    PAID: ["payments.register"],
  } as const;
  const copy = {
    DRAFT: ["Nuevo borrador para facturación", `La factura ${invoice.number} de ${invoice.client.fullName} está lista para revisión.`],
    ISSUED: ["Factura pendiente", `La factura ${invoice.number} de ${invoice.client.fullName} fue emitida y está pendiente de pago.`],
    PARTIAL_PAYMENT: ["Pago parcial registrado", `Se registró un pago parcial en la factura ${invoice.number}.`],
    PAID: ["Factura pagada", `La factura ${invoice.number} de ${invoice.client.fullName} fue pagada.`],
  } as const;
  const [title, message] = copy[event];
  await createInAppNotification({
    clinicId: invoice.clinicId,
    eventKey: `invoice:${invoice.id}:${event}`,
    type: `INVOICE_${event}`,
    title,
    message,
    targetUrl: `/invoices/${invoice.id}`,
    userIds: (await getMembersWithPermission(invoice.clinicId, [...permissionMap[event]])).map((member) => member.userId),
  });
}

export async function notifyEmployeeOnboardingCompleted(userId: string, clinicId: number) {
  const ready = await prisma.employeeInvite.findFirst({
    where: { clinicId, userId, acceptedAt: { not: null }, revokedAt: null },
    select: { invitedUser: { select: { name: true, mustChangePassword: true, onboardingCompletedAt: true } }, clinicId: true },
  });
  if (!ready?.invitedUser || ready.invitedUser.mustChangePassword || !ready.invitedUser.onboardingCompletedAt) return;
  await createInAppNotification({
    clinicId,
    eventKey: `employee-onboarding-completed:${clinicId}:${userId}`,
    type: "EMPLOYEE_ONBOARDING_COMPLETED",
    title: "Acceso completado",
    message: `${ready.invitedUser.name} ya completó su acceso a Karey Vet.`,
    targetUrl: "/employees",
    userIds: (await getAdminIds(clinicId)).filter((id) => id !== userId),
  });
}

export async function syncInventoryNotifications(clinicId: number) {
  const now = new Date();
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { inventoryExpiryAlertDays: true } });
  if (!clinic) return;
  const threshold = new Date(now.getTime() + clinic.inventoryExpiryAlertDays * 86_400_000);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const products = await prisma.product.findMany({
    where: { clinicId, isActive: true },
    select: { id: true, name: true, trackStock: true, stockOnHand: true, minStock: true, expirationDate: true },
  });
  const lowStock = products.filter((p) => p.trackStock && p.stockOnHand <= p.minStock);
  const expiring = products.filter((p) => p.expirationDate && p.expirationDate >= today && p.expirationDate <= threshold);
  const activeKeys = new Set<string>();
  for (const product of lowStock) {
    const key = `inventory:low-stock:${product.id}`;
    activeKeys.add(key);
    await createInAppNotification({ clinicId, eventKey: key, type: "INVENTORY_LOW_STOCK", title: "Stock bajo", message: `${product.name} está por debajo del stock mínimo (${product.stockOnHand} disponibles / mínimo ${product.minStock}).`, targetUrl: "/inventory", userIds: (await getMembersWithPermission(clinicId, ["inventory.read"])).map((m) => m.userId) });
  }
  for (const product of expiring) {
    const days = Math.max(0, Math.ceil((product.expirationDate!.getTime() - today.getTime()) / 86_400_000));
    const key = `inventory:expiring:${product.id}`;
    activeKeys.add(key);
    await createInAppNotification({ clinicId, eventKey: key, type: "INVENTORY_EXPIRING", title: "Producto próximo a vencer", message: `${product.name} vence en ${days} días.`, targetUrl: "/inventory", userIds: (await getMembersWithPermission(clinicId, ["inventory.read"])).map((m) => m.userId) });
  }
  const previous = await prisma.notification.findMany({ where: { clinicId, eventKey: { startsWith: "inventory:" } }, select: { id: true, eventKey: true } });
  const resolvedIds = previous.filter((n) => n.eventKey && !activeKeys.has(n.eventKey)).map((n) => n.id);
  if (resolvedIds.length) await prisma.notification.deleteMany({ where: { id: { in: resolvedIds } } });
}

export function isInvoicePaymentEvent(status: InvoiceStatus) {
  return status === InvoiceStatus.PARTIALLY_PAID ? "PARTIAL_PAYMENT" : status === InvoiceStatus.PAID ? "PAID" : null;
}
