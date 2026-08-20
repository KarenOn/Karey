function normalizeMessage(message: string | null | undefined) {
  return (message ?? "").trim().toLowerCase();
}

export function getFriendlyAuthMessage(
  message: string | null | undefined,
  context: "login" | "register" | "password"
) {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    if (context === "register") {
      return "No pudimos crear tu cuenta en este momento.";
    }

    if (context === "password") {
      return "No pudimos actualizar la contraseña.";
    }

    return "No pudimos iniciar sesión.";
  }

  if (
    normalized.includes("invalid email or password") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("wrong password") ||
    normalized.includes("user not found") ||
    normalized.includes("invalid password")
  ) {
    return "El correo o la contraseña no coinciden. Revísalos e inténtalo nuevamente.";
  }

  if (
    normalized.includes("user already exists") ||
    normalized.includes("email already exists") ||
    normalized.includes("owner_email_already_exists")
  ) {
    return "Ya existe una cuenta con ese correo.";
  }

  if (
    normalized.includes("email not verified") ||
    normalized.includes("verify your email")
  ) {
    return "Tu correo todavía no ha sido verificado. Revisa tu bandeja de entrada para continuar.";
  }

  if (
    normalized.includes("too many requests") ||
    normalized.includes("rate limit") ||
    normalized.includes("try again later")
  ) {
    return "Hiciste varios intentos en poco tiempo. Espera un momento y vuelve a intentarlo.";
  }

  if (
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("timeout")
  ) {
    return "No pudimos conectarnos en este momento. Revisa tu conexión e inténtalo nuevamente.";
  }

  if (context === "register") {
    return "No pudimos completar el registro. Revisa tus datos e inténtalo nuevamente.";
  }

  if (context === "password") {
    return "No pudimos actualizar la contraseña. Inténtalo nuevamente.";
  }

  return "No pudimos iniciar sesión. Inténtalo nuevamente.";
}

export function getFriendlyVerificationMessage(message: string | null | undefined) {
  const normalized = normalizeMessage(message);

  if (
    normalized.includes("too many requests") ||
    normalized.includes("rate limit")
  ) {
    return "Ya enviamos varios correos en poco tiempo. Espera un momento antes de intentarlo otra vez.";
  }

  return "No pudimos enviar el correo de verificación en este momento.";
}

export function getFriendlyWelcomeEmailWarning() {
  return "La cuenta fue creada, pero no pudimos enviar el correo de bienvenida.";
}
