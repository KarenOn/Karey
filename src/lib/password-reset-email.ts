
import { buildEmailShell, escapeHtml } from "@/lib/email";

export async function sendPasswordResetEmail(input: {
  to: string;
  userName?: string | null;
  resetUrl: string;
}) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const from = process.env.MAIL_FROM ?? process.env.SMTP_USER;
  if (!host || Number.isNaN(port) || !from) throw new Error("SMTP no configurado.");
  const nodemailer = await import("nodemailer");
  const transport: { host: string; port: number; secure: boolean; auth?: { user: string; pass: string } } = {
    host,
    port,
    secure: (process.env.SMTP_SECURE ?? String(port === 465)).toLowerCase() === "true",
  };
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transport.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  }
  const transporter = nodemailer.default.createTransport(transport);
  const name = input.userName?.trim() || "Hola";
  const greeting = name === "Hola" ? name : `Hola, ${name}`;
  const text = [
    `${greeting}, recibimos una solicitud para restablecer tu contraseña en Karey Vet.`,
    `Usa este enlace temporal y de un solo uso: ${input.resetUrl}`,
    "Este enlace expirará en una hora.",
    "Si no solicitaste este cambio, ignora este correo.",
  ].join("\n");
  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME ?? "Karey Vet"}" <${from}>`,
    to: input.to,
    subject: "Restablece tu contraseña en Karey Vet",
    text,
    html: buildEmailShell({
      bodyHtml: `<p style="margin:0;font-size:15px;line-height:1.7;color:#526077;">${escapeHtml(greeting)}, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p><p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#526077;">Este enlace expirará en una hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>`,
      ctaHref: input.resetUrl,
      ctaLabel: "Restablecer contraseña",
      intro: "Mantén tu cuenta protegida usando el enlace seguro que aparece a continuación.",
      title: "Restablece tu contraseña",
    }),
  });
}
