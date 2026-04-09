import nodemailer, { type Transporter } from "nodemailer";

type EmailMessage = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

type EmployeeInviteEmailInput = {
  clinicName: string;
  employeeName?: string | null;
  expiresAt: Date;
  inviteUrl: string;
  invitedByName?: string | null;
  roleName: string;
  tempPassword?: string | null;
  to: string;
};

type VerificationEmailInput = {
  to: string;
  userName?: string | null;
  verifyUrl: string;
};

type AppointmentReminderEmailInput = {
  appointmentTypeLabel: string;
  audience: "admin" | "client";
  clinicName: string;
  confirmUrl?: string | null;
  petName: string;
  recipientName?: string | null;
  startAt: Date;
  to: string;
};

type PaymentReminderEmailInput = {
  audience: "admin" | "client";
  clientName: string;
  clinicName: string;
  dueDate: Date;
  invoiceNumber: string;
  petName?: string | null;
  recipientName?: string | null;
  to: string;
  total: string;
};

export class MailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailConfigurationError";
  }
}

const globalForMail = globalThis as typeof globalThis & {
  __appMailerTransporter?: Transporter;
};

function normalizeBaseUrl(value: string | undefined | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");

  if (/^https?:\/\//i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash;
  }

  return `https://${withoutTrailingSlash}`;
}

function isLocalUrl(value: string | null) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "0.0.0.0"
    );
  } catch {
    return false;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toBoolean(value: string | undefined, fallback: boolean) {
  if (value == null || value === "") return fallback;
  return value.toLowerCase() === "true";
}

export function getAppBaseUrl() {
  const configuredUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeBaseUrl(process.env.BETTER_AUTH_URL);
  const deploymentUrl =
    normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeBaseUrl(process.env.VERCEL_URL);

  if (deploymentUrl && (!configuredUrl || isLocalUrl(configuredUrl))) {
    return deploymentUrl;
  }

  return configuredUrl ?? deploymentUrl ?? "http://localhost:3002";
}

export function getAppUrl(path = "") {
  const baseUrl = getAppBaseUrl();
  if (!path) return baseUrl;
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function getMailFromAddress() {
  return process.env.MAIL_FROM ?? process.env.SMTP_USER;
}

function getMailFromName() {
  return process.env.MAIL_FROM_NAME ?? "KiskeyaVet";
}

function getTransporter() {
  if (globalForMail.__appMailerTransporter) {
    return globalForMail.__appMailerTransporter;
  }

  const host = process.env.SMTP_HOST;
  const portValue = process.env.SMTP_PORT;
  const from = getMailFromAddress();
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    throw new MailConfigurationError("Falta SMTP_HOST para enviar correos.");
  }

  if (!portValue) {
    throw new MailConfigurationError("Falta SMTP_PORT para enviar correos.");
  }

  if (!from) {
    throw new MailConfigurationError(
      "Falta MAIL_FROM o SMTP_USER para definir el remitente."
    );
  }

  const port = Number(portValue);
  if (Number.isNaN(port)) {
    throw new MailConfigurationError("SMTP_PORT debe ser un numero valido.");
  }

  if ((user && !pass) || (!user && pass)) {
    throw new MailConfigurationError(
      "SMTP_USER y SMTP_PASS deben configurarse juntos."
    );
  }

  const secure = toBoolean(process.env.SMTP_SECURE, port === 465);

  const transporter = nodemailer.createTransport({
    auth: user && pass ? { pass, user } : undefined,
    host,
    port,
    secure,
  });

  globalForMail.__appMailerTransporter = transporter;
  return transporter;
}

async function sendEmail({ html, subject, text, to }: EmailMessage) {
  const transporter = getTransporter();
  const fromAddress = getMailFromAddress();

  if (!fromAddress) {
    throw new MailConfigurationError(
      "No se pudo resolver el remitente del correo."
    );
  }

  await transporter.sendMail({
    from: `"${getMailFromName()}" <${fromAddress}>`,
    html,
    subject,
    text,
    to,
  });
}

function buildEmailShell(input: {
  bodyHtml: string;
  ctaHref: string;
  ctaLabel: string;
  intro: string;
  title: string;
}) {
  const appUrl = escapeHtml(getAppBaseUrl());

  return `
    <div style="background:#f4f7fb;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#14213d;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dde5f0;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#0f766e 0%,#1d3557 100%);color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.9;">KiskeyaVet</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">${escapeHtml(input.title)}</h1>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">${escapeHtml(input.intro)}</p>
          ${input.bodyHtml}
          <div style="margin:28px 0;">
            <a href="${escapeHtml(
              input.ctaHref
            )}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700;">${escapeHtml(
    input.ctaLabel
  )}</a>
          </div>
          <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#526077;">
            Si el boton no funciona, copia y pega este enlace en tu navegador:
          </p>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.6;word-break:break-all;">
            <a href="${escapeHtml(input.ctaHref)}" style="color:#0f766e;">${escapeHtml(
    input.ctaHref
  )}</a>
          </p>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#7a8799;">
            Enviado desde <a href="${appUrl}" style="color:#1d3557;">${appUrl}</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildInfoList(items: Array<{ label: string; value: string }>) {
  const rows = items
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:10px 0;color:#526077;font-size:14px;vertical-align:top;">${escapeHtml(
            label
          )}</td>
          <td style="padding:10px 0;color:#14213d;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(
            value
          )}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:18px 0 22px;">
      ${rows}
    </table>
  `;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export async function sendEmployeeInviteEmail({
  clinicName,
  employeeName,
  expiresAt,
  inviteUrl,
  invitedByName,
  roleName,
  tempPassword,
  to,
}: EmployeeInviteEmailInput) {
  const introName = employeeName?.trim() || "Hola";
  const inviterText = invitedByName?.trim()
    ? `La invitacion fue creada por ${invitedByName.trim()}.`
    : "Ya tienes una invitacion lista para entrar al sistema.";
  const passwordText = tempPassword
    ? "Incluimos una contrasena temporal para tu primer acceso."
    : "Si ya tenias una cuenta, puedes ingresar con tu contrasena actual.";

  const details: Array<{ label: string; value: string }> = [
    { label: "Clinica", value: clinicName },
    { label: "Correo", value: to },
    { label: "Rol asignado", value: roleName },
    { label: "Expira", value: formatDate(expiresAt) },
  ];

  if (tempPassword) {
    details.push({ label: "Contrasena temporal", value: tempPassword });
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
      ${escapeHtml(introName)}, has sido invitado a unirte a la clinica ${escapeHtml(
    clinicName
  )} en KiskeyaVet.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
      ${escapeHtml(inviterText)} ${escapeHtml(passwordText)}
    </p>
    ${buildInfoList(details)}
  `;

  const textLines = [
    `${introName}, has sido invitado a ${clinicName} en KiskeyaVet.`,
    inviterText,
    `Rol asignado: ${roleName}`,
    `Correo: ${to}`,
    `Expira: ${formatDate(expiresAt)}`,
    tempPassword
      ? `Contrasena temporal: ${tempPassword}`
      : "Usa tu contrasena actual si ya habias ingresado antes.",
    `Acepta la invitacion aqui: ${inviteUrl}`,
  ];

  await sendEmail({
    html: buildEmailShell({
      bodyHtml,
      ctaHref: inviteUrl,
      ctaLabel: "Aceptar invitacion",
      intro: "Tu acceso ya esta listo.",
      title: "Invitacion de empleado",
    }),
    subject: `Invitacion para ${clinicName}`,
    text: textLines.join("\n"),
    to,
  });
}

export async function sendVerificationEmail({
  to,
  userName,
  verifyUrl,
}: VerificationEmailInput) {
  const introName = userName?.trim() || "Hola";
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
      ${escapeHtml(
        introName
      )}, confirma tu correo para completar la configuracion de tu cuenta y mantener tu acceso protegido.
    </p>
    ${buildInfoList([
      { label: "Correo", value: to },
      { label: "Aplicacion", value: "KiskeyaVet" },
    ])}
  `;

  const textLines = [
    `${introName}, confirma tu correo para completar la configuracion de tu cuenta.`,
    `Correo: ${to}`,
    `Verifica aqui: ${verifyUrl}`,
  ];

  await sendEmail({
    html: buildEmailShell({
      bodyHtml,
      ctaHref: verifyUrl,
      ctaLabel: "Verificar correo",
      intro: "Necesitamos confirmar que este correo te pertenece.",
      title: "Verifica tu correo",
    }),
    subject: "Verifica tu correo en KiskeyaVet",
    text: textLines.join("\n"),
    to,
  });
}

export async function sendAppointmentReminderEmail({
  appointmentTypeLabel,
  audience,
  clinicName,
  confirmUrl,
  petName,
  recipientName,
  startAt,
  to,
}: AppointmentReminderEmailInput) {
  const introName = recipientName?.trim() || "Hola";
  const isClient = audience === "client";
  const hasConfirmation = isClient && !!confirmUrl;
  const title = hasConfirmation ? "Confirma tu cita" : "Recordatorio de cita";
  const intro = hasConfirmation
    ? "Queremos dejar tu agenda confirmada con anticipacion."
    : "Tienes una cita programada en KiskeyaVet.";
  const ctaHref = hasConfirmation
    ? confirmUrl
    : audience === "admin"
      ? getAppUrl("/appointments")
      : getAppBaseUrl();
  const ctaLabel = hasConfirmation
    ? "Confirmar cita"
    : audience === "admin"
      ? "Ver agenda"
      : "Abrir KiskeyaVet";
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
      ${escapeHtml(introName)}, ${
        hasConfirmation
          ? `tienes una cita programada en ${escapeHtml(clinicName)} y puedes confirmarla con un clic.`
          : `te recordamos la cita programada para ${escapeHtml(petName)} en ${escapeHtml(clinicName)}.`
      }
    </p>
    ${buildInfoList([
      { label: "Clinica", value: clinicName },
      { label: "Paciente", value: petName },
      { label: "Tipo", value: appointmentTypeLabel },
      { label: "Fecha", value: formatDate(startAt) },
      { label: "Correo", value: to },
    ])}
  `;

  const textLines = [
    `${introName}, ${
      hasConfirmation
        ? `tienes una cita programada en ${clinicName}.`
        : `te recordamos la cita programada para ${petName} en ${clinicName}.`
    }`,
    `Paciente: ${petName}`,
    `Tipo: ${appointmentTypeLabel}`,
    `Fecha: ${formatDate(startAt)}`,
    hasConfirmation ? `Confirma aqui: ${ctaHref}` : `Detalle: ${ctaHref}`,
  ];

  await sendEmail({
    html: buildEmailShell({
      bodyHtml,
      ctaHref,
      ctaLabel,
      intro,
      title,
    }),
    subject: hasConfirmation
      ? `Confirma tu cita en ${clinicName}`
      : `Recordatorio de cita en ${clinicName}`,
    text: textLines.join("\n"),
    to,
  });
}

export async function sendPaymentReminderEmail({
  audience,
  clientName,
  clinicName,
  dueDate,
  invoiceNumber,
  petName,
  recipientName,
  to,
  total,
}: PaymentReminderEmailInput) {
  const introName = recipientName?.trim() || "Hola";
  const targetName = audience === "client" ? clientName : recipientName?.trim() || "equipo";
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
      ${escapeHtml(introName)}, te recordamos que la factura ${escapeHtml(
    invoiceNumber
  )} tiene vencimiento proximo en ${escapeHtml(clinicName)}.
    </p>
    ${buildInfoList([
      { label: "Cliente", value: clientName },
      ...(petName ? [{ label: "Paciente", value: petName }] : []),
      { label: "Factura", value: invoiceNumber },
      { label: "Monto", value: total },
      { label: "Vence", value: formatDate(dueDate) },
      { label: "Destinatario", value: targetName },
    ])}
  `;

  const textLines = [
    `${introName}, la factura ${invoiceNumber} tiene vencimiento proximo en ${clinicName}.`,
    `Cliente: ${clientName}`,
    ...(petName ? [`Paciente: ${petName}`] : []),
    `Monto: ${total}`,
    `Vence: ${formatDate(dueDate)}`,
    `Detalle: ${getAppBaseUrl()}`,
  ];

  await sendEmail({
    html: buildEmailShell({
      bodyHtml,
      ctaHref: getAppBaseUrl(),
      ctaLabel: "Abrir KiskeyaVet",
      intro: "Este es un recordatorio automatico de pago.",
      title: "Recordatorio de pago",
    }),
    subject: `Recordatorio de pago ${invoiceNumber}`,
    text: textLines.join("\n"),
    to,
  });
}
