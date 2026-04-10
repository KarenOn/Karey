import crypto from "crypto";
import {
  AppointmentStatus,
  AppointmentType,
  InvoiceStatus,
  NotificationChannel,
  NotificationStatus,
} from "@/generated/prisma/client";
import {
  getAppUrl,
  sendAppointmentReminderEmail,
  sendPaymentReminderEmail,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { isValidWhatsAppPhone, sendWhatsAppMessage } from "@/lib/whatsapp";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const APPOINTMENT_CONFIRM_IDENTIFIER_PREFIX = "appointment-confirmation:";

const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  AESTHETIC: "Estetica",
  BATH: "Bano",
  CHECKUP: "Chequeo",
  CONSULTATION: "Consulta",
  DEWORMING: "Desparasitacion",
  EMERGENCY: "Emergencia",
  GROOMING: "Peluqueria",
  HOSPITALIZATION: "Hospitalizacion",
  OTHER: "Otro",
  SURGERY: "Cirugia",
  VACCINATION: "Vacunacion",
};

type ReminderAudience = "admin" | "client";

type AppointmentReminderMeta = {
  appointmentId: number;
  appointmentTypeLabel: string;
  audience: ReminderAudience;
  clinicName: string;
  clientName: string;
  confirmUrl: string | null;
  kind: "appointment-reminder";
  petName: string;
  recipientName: string | null;
  startAtIso: string;
  status: AppointmentStatus;
};

type PaymentReminderMeta = {
  audience: ReminderAudience;
  clientName: string;
  clinicName: string;
  dueDateIso: string;
  invoiceId: number;
  invoiceNumber: string;
  kind: "payment-reminder";
  petName: string | null;
  recipientName: string | null;
  total: string;
};

function scheduleOneDayBefore(date: Date) {
  const scheduledAt = new Date(date.getTime() - DAY_IN_MS);
  return scheduledAt > new Date() ? scheduledAt : new Date();
}

function appointmentNotificationTitles(appointmentId: number) {
  return [
    `APPOINTMENT_REMINDER:${appointmentId}:CLIENT:EMAIL`,
    `APPOINTMENT_REMINDER:${appointmentId}:CLIENT:WHATSAPP`,
    `APPOINTMENT_REMINDER:${appointmentId}:ADMIN:EMAIL`,
    `APPOINTMENT_REMINDER:${appointmentId}:ADMIN:WHATSAPP`,
  ];
}

function invoiceNotificationTitles(invoiceId: number) {
  return [
    `PAYMENT_REMINDER:${invoiceId}:CLIENT:EMAIL`,
    `PAYMENT_REMINDER:${invoiceId}:CLIENT:WHATSAPP`,
    `PAYMENT_REMINDER:${invoiceId}:ADMIN:EMAIL`,
    `PAYMENT_REMINDER:${invoiceId}:ADMIN:WHATSAPP`,
  ];
}

async function cancelQueuedNotificationsByTitles(titles: string[]) {
  if (!titles.length) {
    return;
  }

  const notifications = await prisma.notification.findMany({
    where: {
      status: NotificationStatus.QUEUED,
      title: { in: titles },
    },
    select: { id: true },
  });

  if (!notifications.length) {
    return;
  }

  const notificationIds = notifications.map((notification) => notification.id);

  await prisma.$transaction([
    prisma.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: {
        error: "Cancelada por reprogramacion.",
        status: NotificationStatus.CANCELLED,
      },
    }),
    prisma.notificationRecipient.updateMany({
      where: {
        notificationId: { in: notificationIds },
        status: NotificationStatus.QUEUED,
      },
      data: {
        error: "Cancelada por reprogramacion.",
        status: NotificationStatus.CANCELLED,
      },
    }),
  ]);
}

async function replaceAppointmentConfirmationToken(
  appointmentId: number,
  expiresAt: Date
) {
  await prisma.verification.deleteMany({
    where: {
      identifier: { startsWith: APPOINTMENT_CONFIRM_IDENTIFIER_PREFIX },
      value: String(appointmentId),
    },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await prisma.verification.create({
    data: {
      expiresAt,
      id: crypto.randomBytes(16).toString("hex"),
      identifier: `${APPOINTMENT_CONFIRM_IDENTIFIER_PREFIX}${tokenHash}`,
      value: String(appointmentId),
    },
  });

  return token;
}

async function deleteAppointmentConfirmationTokens(appointmentId: number) {
  await prisma.verification.deleteMany({
    where: {
      identifier: { startsWith: APPOINTMENT_CONFIRM_IDENTIFIER_PREFIX },
      value: String(appointmentId),
    },
  });
}

export async function clearAppointmentReminderNotifications(appointmentId: number) {
  await cancelQueuedNotificationsByTitles(
    appointmentNotificationTitles(appointmentId)
  );
  await deleteAppointmentConfirmationTokens(appointmentId);
}

export async function clearInvoicePaymentReminderNotifications(invoiceId: number) {
  await cancelQueuedNotificationsByTitles(invoiceNotificationTitles(invoiceId));
}

async function getAdminRecipients(clinicId: number) {
  const members = await prisma.clinicMember.findMany({
    where: {
      clinicId,
      isActive: true,
      role: {
        is: {
          isActive: true,
          key: { in: ["owner", "admin"] },
        },
      },
    },
    select: {
      user: {
        select: {
          email: true,
          id: true,
          name: true,
          profile: {
            select: {
              phone: true,
            },
          },
        },
      },
    },
  });

  return members
    .map((member) => ({
      email: member.user.email,
      name: member.user.name,
      phone: member.user.profile?.phone ?? null,
      userId: member.user.id,
    }))
    .filter(
      (recipient, index, list) =>
        list.findIndex((item) => item.userId === recipient.userId) === index
    );
}

async function createQueuedNotification(params: {
  channel: NotificationChannel;
  clinicId: number;
  email?: string | null;
  message: string;
  meta: AppointmentReminderMeta | PaymentReminderMeta;
  phone?: string | null;
  scheduledAt: Date;
  title: string;
  userId?: string | null;
  clientId?: number | null;
}) {
  await prisma.notification.create({
    data: {
      channel: params.channel,
      clinicId: params.clinicId,
      message: params.message,
      meta: JSON.parse(JSON.stringify(params.meta)),
      scheduledAt: params.scheduledAt,
      status: NotificationStatus.QUEUED,
      title: params.title,
      recipients: {
        create: {
          clientId: params.clientId ?? null,
          email: params.email ?? null,
          phone: params.phone ?? null,
          status: NotificationStatus.QUEUED,
          userId: params.userId ?? null,
        },
      },
    },
  });
}

function canSendAppointmentReminder(status: AppointmentStatus) {
  return (
    status === AppointmentStatus.SCHEDULED ||
    status === AppointmentStatus.CONFIRMED
  );
}

function canSendPaymentReminder(status: InvoiceStatus, dueDate: Date | null) {
  if (!dueDate) {
    return false;
  }

  return (
    status === InvoiceStatus.ISSUED || status === InvoiceStatus.PARTIALLY_PAID
  );
}

function isAppointmentReminderMeta(
  meta: unknown
): meta is AppointmentReminderMeta {
  if (!meta || typeof meta !== "object") {
    return false;
  }

  return (meta as { kind?: string }).kind === "appointment-reminder";
}

function isPaymentReminderMeta(meta: unknown): meta is PaymentReminderMeta {
  if (!meta || typeof meta !== "object") {
    return false;
  }

  return (meta as { kind?: string }).kind === "payment-reminder";
}

function buildAppointmentWhatsAppText(meta: AppointmentReminderMeta) {
  const appointmentDate = new Date(meta.startAtIso);

  if (meta.audience === "client") {
    const now = new Date();
    const timeLabel = new Intl.DateTimeFormat("es-DO", {
      hour: "numeric",
      minute: "2-digit",
    }).format(appointmentDate);
    const todayKey = now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = tomorrow.toDateString();
    const appointmentDayKey = appointmentDate.toDateString();

    const whenLabel =
      appointmentDayKey === tomorrowKey
        ? `manana a las ${timeLabel}`
        : appointmentDayKey === todayKey
          ? `hoy a las ${timeLabel}`
          : `el ${new Intl.DateTimeFormat("es-DO", {
              day: "numeric",
              month: "long",
            }).format(appointmentDate)} a las ${timeLabel}`;

    return `Hola ${meta.recipientName?.trim() || meta.clientName}, te recordamos que ${meta.petName} tiene una cita ${whenLabel} para ${meta.appointmentTypeLabel} en ${meta.clinicName}. Te esperamos.`;
  }

  const dateLabel = new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(appointmentDate);

  return [
    `Recordatorio de cita en ${meta.clinicName}.`,
    `Cliente: ${meta.clientName}`,
    `Paciente: ${meta.petName}`,
    `Tipo: ${meta.appointmentTypeLabel}`,
    `Fecha: ${dateLabel}`,
  ].join("\n");
}

function buildPaymentWhatsAppText(meta: PaymentReminderMeta) {
  const dueDateLabel = new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(meta.dueDateIso));

  return [
    `Recordatorio de pago en ${meta.clinicName}.`,
    `Factura: ${meta.invoiceNumber}`,
    `Cliente: ${meta.clientName}`,
    ...(meta.petName ? [`Paciente: ${meta.petName}`] : []),
    `Monto: ${meta.total}`,
    `Vence: ${dueDateLabel}`,
  ].join("\n");
}

async function deliverNotification(params: {
  channel: NotificationChannel;
  email: string | null;
  meta: AppointmentReminderMeta | PaymentReminderMeta | null;
  phone: string | null;
}) {
  const { channel, email, meta, phone } = params;

  if (!meta) {
    throw new Error("La notificacion no tiene metadata valida.");
  }

  if (channel === NotificationChannel.EMAIL) {
    if (!email) {
      throw new Error("La notificacion no tiene correo destino.");
    }

    if (isAppointmentReminderMeta(meta)) {
      await sendAppointmentReminderEmail({
        appointmentTypeLabel: meta.appointmentTypeLabel,
        audience: meta.audience,
        clinicName: meta.clinicName,
        confirmUrl: meta.confirmUrl,
        petName: meta.petName,
        recipientName: meta.recipientName,
        startAt: new Date(meta.startAtIso),
        to: email,
      });
      return;
    }

    if (isPaymentReminderMeta(meta)) {
      await sendPaymentReminderEmail({
        audience: meta.audience,
        clientName: meta.clientName,
        clinicName: meta.clinicName,
        dueDate: new Date(meta.dueDateIso),
        invoiceNumber: meta.invoiceNumber,
        petName: meta.petName,
        recipientName: meta.recipientName,
        to: email,
        total: meta.total,
      });
      return;
    }
  }

  if (channel === NotificationChannel.WHATSAPP) {
    if (!phone) {
      throw new Error("La notificacion no tiene telefono destino.");
    }

    if (isAppointmentReminderMeta(meta)) {
      await sendWhatsAppMessage({
        body: buildAppointmentWhatsAppText(meta),
        to: phone,
      });
      return;
    }

    if (isPaymentReminderMeta(meta)) {
      await sendWhatsAppMessage({
        body: buildPaymentWhatsAppText(meta),
        to: phone,
      });
      return;
    }
  }

  throw new Error(`Canal o metadata no soportados: ${channel}.`);
}

async function markAppointmentReminderDelivered(params: {
  channel: NotificationChannel;
  meta: AppointmentReminderMeta | PaymentReminderMeta | null;
}) {
  const { channel, meta } = params;

  if (
    channel !== NotificationChannel.WHATSAPP ||
    !meta ||
    !isAppointmentReminderMeta(meta) ||
    meta.audience !== "client"
  ) {
    return;
  }

  await prisma.appointment.updateMany({
    where: { id: meta.appointmentId },
    data: {
      reminderSent: true,
      reminderSentAt: new Date(),
    },
  });
}

export async function syncAppointmentReminderNotifications(appointmentId: number) {
  await cancelQueuedNotificationsByTitles(
    appointmentNotificationTitles(appointmentId)
  );

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      clinicId: true,
      client: {
        select: {
          email: true,
          fullName: true,
          id: true,
          phone: true,
        },
      },
      clinic: {
        select: {
          name: true,
        },
      },
      id: true,
      pet: {
        select: {
          name: true,
        },
      },
      startAt: true,
      status: true,
      type: true,
    },
  });

  if (!appointment) {
    await deleteAppointmentConfirmationTokens(appointmentId);
    return;
  }

  if (!canSendAppointmentReminder(appointment.status)) {
    await deleteAppointmentConfirmationTokens(appointmentId);
    return;
  }

  const scheduledAt = scheduleOneDayBefore(appointment.startAt);
  const confirmToken =
    appointment.status === AppointmentStatus.SCHEDULED
      ? await replaceAppointmentConfirmationToken(appointment.id, appointment.startAt)
      : null;

  if (appointment.status !== AppointmentStatus.SCHEDULED) {
    await deleteAppointmentConfirmationTokens(appointment.id);
  }

  const confirmUrl = confirmToken
    ? getAppUrl(`/confirm-appointment?token=${confirmToken}`)
    : null;
  const appointmentTypeLabel = APPOINTMENT_TYPE_LABELS[appointment.type];
  const adminRecipients = await getAdminRecipients(appointment.clinicId);

  const notifications: Array<Promise<unknown>> = [];

  if (appointment.client.email) {
    notifications.push(
      createQueuedNotification({
        channel: NotificationChannel.EMAIL,
        clientId: appointment.client.id,
        clinicId: appointment.clinicId,
        email: appointment.client.email,
        message:
          appointment.status === AppointmentStatus.SCHEDULED
            ? "Recordatorio con confirmacion pendiente para la cita."
            : "Recordatorio de cita confirmada para el cliente.",
        meta: {
          appointmentId: appointment.id,
          appointmentTypeLabel,
          audience: "client",
          clinicName: appointment.clinic.name,
          clientName: appointment.client.fullName,
          confirmUrl,
          kind: "appointment-reminder",
          petName: appointment.pet.name,
          recipientName: appointment.client.fullName,
          startAtIso: appointment.startAt.toISOString(),
          status: appointment.status,
        },
        scheduledAt,
        title: `APPOINTMENT_REMINDER:${appointment.id}:CLIENT:EMAIL`,
      })
    );
  }

  if (isValidWhatsAppPhone(appointment.client.phone)) {
    notifications.push(
      createQueuedNotification({
        channel: NotificationChannel.WHATSAPP,
        clientId: appointment.client.id,
        clinicId: appointment.clinicId,
        message:
          appointment.status === AppointmentStatus.SCHEDULED
            ? "Recordatorio por WhatsApp con confirmacion pendiente."
            : "Recordatorio de cita confirmada por WhatsApp.",
        meta: {
          appointmentId: appointment.id,
          appointmentTypeLabel,
          audience: "client",
          clinicName: appointment.clinic.name,
          clientName: appointment.client.fullName,
          confirmUrl,
          kind: "appointment-reminder",
          petName: appointment.pet.name,
          recipientName: appointment.client.fullName,
          startAtIso: appointment.startAt.toISOString(),
          status: appointment.status,
        },
        phone: appointment.client.phone,
        scheduledAt,
        title: `APPOINTMENT_REMINDER:${appointment.id}:CLIENT:WHATSAPP`,
      })
    );
  }

  for (const admin of adminRecipients) {
    if (admin.email) {
      notifications.push(
        createQueuedNotification({
          channel: NotificationChannel.EMAIL,
          clinicId: appointment.clinicId,
          email: admin.email,
          message: "Recordatorio para el equipo administrativo sobre una cita proxima.",
          meta: {
            appointmentId: appointment.id,
            appointmentTypeLabel,
            audience: "admin",
            clinicName: appointment.clinic.name,
            clientName: appointment.client.fullName,
            confirmUrl: null,
            kind: "appointment-reminder",
            petName: appointment.pet.name,
            recipientName: admin.name,
            startAtIso: appointment.startAt.toISOString(),
            status: appointment.status,
          },
          scheduledAt,
          title: `APPOINTMENT_REMINDER:${appointment.id}:ADMIN:EMAIL`,
          userId: admin.userId,
        })
      );
    }

    if (isValidWhatsAppPhone(admin.phone)) {
      notifications.push(
        createQueuedNotification({
          channel: NotificationChannel.WHATSAPP,
          clinicId: appointment.clinicId,
          message: "Recordatorio por WhatsApp para el equipo administrativo.",
          meta: {
            appointmentId: appointment.id,
            appointmentTypeLabel,
            audience: "admin",
            clinicName: appointment.clinic.name,
            clientName: appointment.client.fullName,
            confirmUrl: null,
            kind: "appointment-reminder",
            petName: appointment.pet.name,
            recipientName: admin.name,
            startAtIso: appointment.startAt.toISOString(),
            status: appointment.status,
          },
          phone: admin.phone,
          scheduledAt,
          title: `APPOINTMENT_REMINDER:${appointment.id}:ADMIN:WHATSAPP`,
          userId: admin.userId,
        })
      );
    }
  }

  await Promise.all(notifications);
}

export async function syncInvoicePaymentReminderNotifications(invoiceId: number) {
  await cancelQueuedNotificationsByTitles(invoiceNotificationTitles(invoiceId));

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      clinicId: true,
      client: {
        select: {
          email: true,
          fullName: true,
          id: true,
          phone: true,
        },
      },
      clinic: {
        select: {
          name: true,
        },
      },
      dueDate: true,
      id: true,
      number: true,
      pet: {
        select: {
          name: true,
        },
      },
      status: true,
      total: true,
    },
  });

  if (!invoice || !canSendPaymentReminder(invoice.status, invoice.dueDate)) {
    return;
  }

  const dueDate = invoice.dueDate as Date;
  const scheduledAt = scheduleOneDayBefore(dueDate);
  const adminRecipients = await getAdminRecipients(invoice.clinicId);
  const total = invoice.total.toString();
  const notifications: Array<Promise<unknown>> = [];

  if (invoice.client.email) {
    notifications.push(
      createQueuedNotification({
        channel: NotificationChannel.EMAIL,
        clientId: invoice.client.id,
        clinicId: invoice.clinicId,
        email: invoice.client.email,
        message: "Recordatorio de pago para el cliente.",
        meta: {
          audience: "client",
          clientName: invoice.client.fullName,
          clinicName: invoice.clinic.name,
          dueDateIso: dueDate.toISOString(),
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          kind: "payment-reminder",
          petName: invoice.pet?.name ?? null,
          recipientName: invoice.client.fullName,
          total,
        },
        scheduledAt,
        title: `PAYMENT_REMINDER:${invoice.id}:CLIENT:EMAIL`,
      })
    );
  }

  if (isValidWhatsAppPhone(invoice.client.phone)) {
    notifications.push(
      createQueuedNotification({
        channel: NotificationChannel.WHATSAPP,
        clientId: invoice.client.id,
        clinicId: invoice.clinicId,
        message: "Recordatorio de pago por WhatsApp para el cliente.",
        meta: {
          audience: "client",
          clientName: invoice.client.fullName,
          clinicName: invoice.clinic.name,
          dueDateIso: dueDate.toISOString(),
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          kind: "payment-reminder",
          petName: invoice.pet?.name ?? null,
          recipientName: invoice.client.fullName,
          total,
        },
        phone: invoice.client.phone,
        scheduledAt,
        title: `PAYMENT_REMINDER:${invoice.id}:CLIENT:WHATSAPP`,
      })
    );
  }

  for (const admin of adminRecipients) {
    if (admin.email) {
      notifications.push(
        createQueuedNotification({
          channel: NotificationChannel.EMAIL,
          clinicId: invoice.clinicId,
          email: admin.email,
          message: "Recordatorio de pago para el equipo administrativo.",
          meta: {
            audience: "admin",
            clientName: invoice.client.fullName,
            clinicName: invoice.clinic.name,
            dueDateIso: dueDate.toISOString(),
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            kind: "payment-reminder",
            petName: invoice.pet?.name ?? null,
            recipientName: admin.name,
            total,
          },
          scheduledAt,
          title: `PAYMENT_REMINDER:${invoice.id}:ADMIN:EMAIL`,
          userId: admin.userId,
        })
      );
    }

    if (isValidWhatsAppPhone(admin.phone)) {
      notifications.push(
        createQueuedNotification({
          channel: NotificationChannel.WHATSAPP,
          clinicId: invoice.clinicId,
          message: "Recordatorio de pago por WhatsApp para el equipo administrativo.",
          meta: {
            audience: "admin",
            clientName: invoice.client.fullName,
            clinicName: invoice.clinic.name,
            dueDateIso: dueDate.toISOString(),
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            kind: "payment-reminder",
            petName: invoice.pet?.name ?? null,
            recipientName: admin.name,
            total,
          },
          phone: admin.phone,
          scheduledAt,
          title: `PAYMENT_REMINDER:${invoice.id}:ADMIN:WHATSAPP`,
          userId: admin.userId,
        })
      );
    }
  }

  await Promise.all(notifications);
}

export async function processQueuedNotifications(limit = 50) {
  const now = new Date();
  const dueNotifications = await prisma.notification.findMany({
    where: {
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      status: NotificationStatus.QUEUED,
    },
    include: {
      recipients: {
        orderBy: { id: "asc" },
      },
    },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    take: limit,
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const notification of dueNotifications) {
    processed += 1;
    let anySuccess = false;
    const errors: string[] = [];

    for (const recipient of notification.recipients) {
      try {
        await deliverNotification({
          channel: notification.channel,
          email: recipient.email,
          meta:
            isAppointmentReminderMeta(notification.meta) ||
            isPaymentReminderMeta(notification.meta)
              ? notification.meta
              : null,
          phone: recipient.phone,
        });

        anySuccess = true;
        sent += 1;

        await prisma.notificationRecipient.update({
          where: { id: recipient.id },
          data: {
            error: null,
            sentAt: new Date(),
            status: NotificationStatus.SENT,
          },
        });

        await markAppointmentReminderDelivered({
          channel: notification.channel,
          meta:
            isAppointmentReminderMeta(notification.meta) ||
            isPaymentReminderMeta(notification.meta)
              ? notification.meta
              : null,
        });
      } catch (error) {
        failed += 1;
        const message =
          error instanceof Error ? error.message : "Fallo desconocido enviando notificacion.";
        errors.push(message);

        await prisma.notificationRecipient.update({
          where: { id: recipient.id },
          data: {
            error: message,
            status: NotificationStatus.FAILED,
          },
        });
      }
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        error: errors.length ? errors.join(" | ") : null,
        sentAt: anySuccess ? new Date() : null,
        status: anySuccess ? NotificationStatus.SENT : NotificationStatus.FAILED,
      },
    });
  }

  return {
    failed,
    processed,
    sent,
  };
}

export async function confirmAppointmentFromToken(token: string) {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error("TOKEN_REQUERIDO");
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(normalizedToken)
    .digest("hex");

  const verification = await prisma.verification.findFirst({
    where: {
      expiresAt: { gt: new Date() },
      identifier: `${APPOINTMENT_CONFIRM_IDENTIFIER_PREFIX}${tokenHash}`,
    },
  });

  if (!verification) {
    throw new Error("TOKEN_INVALIDO");
  }

  const appointmentId = Number(verification.value);
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    await prisma.verification.delete({ where: { id: verification.id } });
    throw new Error("TOKEN_INVALIDO");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      client: { select: { fullName: true } },
      id: true,
      pet: { select: { name: true } },
      status: true,
    },
  });

  if (!appointment) {
    await prisma.verification.delete({ where: { id: verification.id } });
    throw new Error("CITA_NO_ENCONTRADA");
  }

  if (
    appointment.status === AppointmentStatus.CANCELLED ||
    appointment.status === AppointmentStatus.NO_SHOW ||
    appointment.status === AppointmentStatus.COMPLETED
  ) {
    await prisma.verification.delete({ where: { id: verification.id } });
    throw new Error("CITA_NO_CONFIRMABLE");
  }

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: AppointmentStatus.CONFIRMED },
    }),
    prisma.verification.delete({
      where: { id: verification.id },
    }),
  ]);

  await syncAppointmentReminderNotifications(appointment.id);

  return {
    clientName: appointment.client.fullName,
    petName: appointment.pet.name,
  };
}
