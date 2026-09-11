import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createLocalAccountIssuer } from "better-auth/db";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const seedAuth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
});

const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.SUPERADMIN_NAME?.trim();
const password = process.env.SUPERADMIN_PASSWORD;

function requireEnv(value: string | undefined, key: string) {
  if (!value) throw new Error(`Falta la variable de entorno ${key}.`);
  return value;
}

function validatePassword(value: string) {
  if (value.length < 12) {
    throw new Error("SUPERADMIN_PASSWORD debe tener al menos 12 caracteres.");
  }

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter((pattern) => pattern.test(value));
  if (classes.length < 3) {
    throw new Error("SUPERADMIN_PASSWORD debe combinar al menos 3 tipos de caracteres.");
  }
}

async function createOrUpdateSuperadmin() {
  const superadminEmail = requireEnv(email, "SUPERADMIN_EMAIL");
  const superadminName = requireEnv(name, "SUPERADMIN_NAME");
  const superadminPassword = requireEnv(password, "SUPERADMIN_PASSWORD");
  validatePassword(superadminPassword);

  const existing = await prisma.user.findUnique({
    where: { email: superadminEmail },
    select: { id: true },
  });

  let userId = existing?.id;

  if (!userId) {
    const result = await seedAuth.api.signUpEmail({
      body: {
        name: superadminName,
        email: superadminEmail,
        password: superadminPassword,
        rememberMe: false,
      },
      headers: new Headers(),
    });

    userId = result.user.id;
  } else {
    const context = await seedAuth.$context;
    const passwordHash = await context.password.hash(superadminPassword);
    await context.internalAdapter.updatePassword(userId, passwordHash);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: superadminName,
      role: "superadmin",
      emailVerified: true,
      banned: false,
      banReason: null,
      banExpires: null,
      mustChangePassword: false,
    },
  });

  const credentialAccount = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "credential",
      issuer: createLocalAccountIssuer("credential"),
    },
    select: { id: true },
  });

  if (!credentialAccount) {
    throw new Error("Better Auth no creó/encontró la cuenta de credenciales esperada.");
  }

  return userId;
}

async function main() {
  const userId = await createOrUpdateSuperadmin();
  const verification = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      banned: true,
      accounts: {
        where: { providerId: "credential", issuer: "local:credential" },
        select: { id: true, accountId: true, password: true },
      },
    },
  });

  if (
    !verification ||
    verification.role !== "superadmin" ||
    !verification.emailVerified ||
    verification.banned ||
    verification.accounts.length !== 1 ||
    verification.accounts[0].accountId !== verification.id ||
    !verification.accounts[0].password
  ) {
    throw new Error("La validación del usuario superadmin no fue satisfactoria.");
  }

  console.log(`Superadmin listo: ${verification.email} (${verification.id}).`);
  console.log("Rol: superadmin | Email verificado: sí | Cuenta credential: sí");
}

main()
  .catch((error) => {
    if (error && typeof error === "object" && "code" in error) {
      console.error(JSON.stringify({ code: error.code, meta: "meta" in error ? error.meta : undefined }));
    } else {
      console.error(error instanceof Error ? error.stack ?? error.message : "No se pudo crear el superadmin.");
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
