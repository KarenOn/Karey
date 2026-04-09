type WhatsAppMessageInput = {
  body: string;
  to: string;
};

export class WhatsAppConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppConfigurationError";
  }
}

function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new WhatsAppConfigurationError("El telefono de WhatsApp esta vacio.");
  }

  const digits = trimmed.replace(/[^\d+]/g, "");
  if (!digits) {
    throw new WhatsAppConfigurationError("El telefono de WhatsApp no es valido.");
  }

  return digits.startsWith("+") ? digits : `+${digits}`;
}

function toWhatsAppAddress(phone: string) {
  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    throw new WhatsAppConfigurationError(
      "Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_FROM para enviar WhatsApp."
    );
  }

  return {
    accountSid,
    authToken,
    from: toWhatsAppAddress(normalizePhone(from)),
  };
}

export async function sendWhatsAppMessage({ body, to }: WhatsAppMessageInput) {
  const provider = (process.env.WHATSAPP_PROVIDER ?? "twilio").trim().toLowerCase();

  if (provider !== "twilio") {
    throw new WhatsAppConfigurationError(
      `Proveedor de WhatsApp no soportado: ${process.env.WHATSAPP_PROVIDER ?? provider}.`
    );
  }

  const config = getTwilioConfig();
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
  const payload = new URLSearchParams({
    Body: body,
    From: config.from,
    To: toWhatsAppAddress(normalizePhone(to)),
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Twilio WhatsApp respondio ${response.status}${text ? `: ${text}` : ""}`
    );
  }
}
