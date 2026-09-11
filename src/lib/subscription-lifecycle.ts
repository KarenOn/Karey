import "server-only";

import { NotificationChannel, NotificationStatus, SubscriptionPaymentStatus } from "@/generated/prisma/client";
import { getClinicDateKey } from "@/lib/appointment-time";
import { prisma } from "@/lib/prisma";

type SubscriptionReminderType = "REMINDER_BEFORE_DUE" | "DUE_TODAY" | "GRACE_REMINDER";

const DAY_MS = 86_400_000;

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addMonths(value: Date, months: number) {
  const next = new Date(value);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function daysUntil(dueDate: Date, now: Date, timezone: string) {
  const due = new Date(`${dateKey(dueDate)}T00:00:00.000Z`);
  const today = new Date(`${getClinicDateKey(now, timezone)}T00:00:00.000Z`);
  return Math.round((due.getTime() - today.getTime()) / DAY_MS);
}

async function notifySubscription(clinic: { id: number; name: string; email: string | null; timezone: string; subscriptionEndDate: Date | null }, type: SubscriptionReminderType, message: string, date: string) {
  const cycle = dateKey(clinic.subscriptionEndDate!);
  const eventKey = `SUBSCRIPTION:${type}:${clinic.id}:${cycle}`;
  const recipients = await prisma.clinicMember.findMany({
    where: { clinicId: clinic.id, isActive: true, role: { is: { isActive: true, key: { in: ["owner", "admin"] } } } },
    select: { userId: true, user: { select: { email: true, name: true } } },
  });
  const userIds = [...new Set(recipients.map((item) => item.userId))];
  if (!userIds.length) return;
  try {
    await prisma.notification.create({
      data: {
        clinicId: clinic.id,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        type: `SUBSCRIPTION_${type}`,
        eventKey,
        title: type === "REMINDER_BEFORE_DUE" ? "Renovación próxima" : "Renovación de suscripción",
        message,
        targetUrl: "/admin/clinics",
        sentAt: new Date(),
        recipients: { create: userIds.map((userId) => ({ userId, status: NotificationStatus.SENT, sentAt: new Date() })) },
      },
    });
  } catch (error) {
    if ((error as { code?: string })?.code !== "P2002") throw error;
  }

  await Promise.all(recipients.filter((item) => item.user.email).map(async (item) => {
    try {
      await prisma.notification.create({
        data: {
          clinicId: clinic.id,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.QUEUED,
          type: `SUBSCRIPTION_${type}`,
          eventKey: `${eventKey}:EMAIL:${item.userId}`,
          title: `SUBSCRIPTION:${type}:EMAIL`,
          message,
          meta: { kindMarker: "subscription-reminder", clinicName: clinic.name, date, kind: type, recipientName: item.user.name },
          recipients: { create: { userId: item.userId, email: item.user.email, status: NotificationStatus.QUEUED } },
        },
      });
    } catch (error) {
      if ((error as { code?: string })?.code !== "P2002") throw error;
    }
  }));
}

export async function reconcileSubscriptions(now = new Date()) {
  const clinics = await prisma.clinic.findMany({
    where: { isActive: true, subscriptionEndDate: { not: null } },
    select: { id: true, name: true, email: true, timezone: true, subscriptionEndDate: true, subscriptionPaymentStatus: true, subscriptionReminderDays: true, subscriptionGraceDays: true },
  });
  let pending = 0;
  let notified = 0;
  for (const clinic of clinics) {
    if (!clinic.subscriptionEndDate) continue;
    const days = daysUntil(clinic.subscriptionEndDate, now, clinic.timezone || "America/Santo_Domingo");
    if (clinic.subscriptionPaymentStatus === SubscriptionPaymentStatus.PAID && days === clinic.subscriptionReminderDays) {
      await notifySubscription(clinic, "REMINDER_BEFORE_DUE", `Hola. Te recordamos que la suscripción de Karey Vet de ${clinic.name} se renueva el ${dateKey(clinic.subscriptionEndDate)}.`, dateKey(clinic.subscriptionEndDate));
      notified += 1;
    }
    if (days <= 0 && clinic.subscriptionPaymentStatus === SubscriptionPaymentStatus.PAID) {
      await prisma.clinic.update({ where: { id: clinic.id }, data: { subscriptionPaymentStatus: SubscriptionPaymentStatus.PENDING } });
      pending += 1;
      if (days === 0) {
        await notifySubscription(clinic, "DUE_TODAY", "Tu suscripción de Karey Vet vence hoy. Puedes realizar el pago para mantener tu servicio activo.", dateKey(clinic.subscriptionEndDate));
        notified += 1;
      }
    }
    if (days < 0 && days >= -clinic.subscriptionGraceDays) {
      await notifySubscription(clinic, "GRACE_REMINDER", `Tenemos pendiente la renovación de Karey Vet. Tu clínica continuará disponible hasta el ${dateKey(new Date(clinic.subscriptionEndDate.getTime() + clinic.subscriptionGraceDays * DAY_MS))}.`, dateKey(new Date(clinic.subscriptionEndDate.getTime() + clinic.subscriptionGraceDays * DAY_MS)));
      notified += 1;
    }
  }
  return { pending, notified };
}

export async function markSubscriptionPaid(clinicId: number) {
  return prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.findUnique({ where: { id: clinicId }, select: { id: true, subscriptionEndDate: true, subscriptionPaymentStatus: true, subscriptionIntervalMonths: true } });
    if (!clinic) throw new Error("CLINIC_NOT_FOUND");
    if (clinic.subscriptionPaymentStatus === SubscriptionPaymentStatus.PAID) throw new Error("SUBSCRIPTION_ALREADY_PAID");
    const nextDueDate = clinic.subscriptionEndDate ? addMonths(clinic.subscriptionEndDate, Math.max(1, clinic.subscriptionIntervalMonths)) : null;
    return tx.clinic.update({ where: { id: clinicId }, data: { subscriptionPaymentStatus: SubscriptionPaymentStatus.PAID, subscriptionPaidAt: new Date(), subscriptionEndDate: nextDueDate }, select: { id: true } });
  });
}
