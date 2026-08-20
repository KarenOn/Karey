
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
  const text = [
    `${name}, recibimos una solicitud para restablecer tu contrasena en Karey Vet.`,
    `Usa este enlace temporal y de un solo uso: ${input.resetUrl}`,
    "Si no solicitaste este cambio, ignora este correo.",
  ].join("\\n");
  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME ?? "Karey Vet"}" <${from}>`,
    to: input.to,
    subject: "Restablece tu contrasena en Karey Vet",
    text,
    html: `<p>${name}, recibimos una solicitud para restablecer tu contrasena en Karey Vet.</p><p><a href="${input.resetUrl}">Restablecer contrasena</a></p><p>Si no solicitaste este cambio, ignora este correo.</p>`,
  });
}
