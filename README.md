# KiskeyaVet

## Desarrollo

```bash
npm run dev
```

La app usa Next.js, Prisma y Better Auth.

## Recordatorios automáticos

La app programa recordatorios automáticos para:

- Citas programadas o confirmadas.
- Facturas emitidas o parcialmente pagadas con fecha de vencimiento.

Los recordatorios se guardan en `Notification` y `NotificationRecipient` y se procesan desde:

```bash
GET /api/notifications/process
POST /api/notifications/process
```

## Seguridad del procesador

- En Vercel, el `vercel.json` incluido lo ejecuta cada 15 minutos.
- Fuera de Vercel, protégelo con `CRON_SECRET` y llama el endpoint con:

```bash
Authorization: Bearer <CRON_SECRET>
```

## Variables de entorno

Correo:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `MAIL_FROM_NAME`

WhatsApp por Twilio:

- `WHATSAPP_PROVIDER=twilio`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

Cron:

- `CRON_SECRET`

## Confirmación de citas

Los recordatorios al cliente incluyen un enlace público a:

```bash
/confirm-appointment?token=...
```

Cuando el cliente confirma desde correo o WhatsApp, la cita cambia a `CONFIRMED`.
