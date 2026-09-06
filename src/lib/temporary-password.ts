import crypto from "crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";

type DatabaseClient = Pick<typeof prisma, "account" | "user">;

export async function setTemporaryPasswordForUser(
  db: DatabaseClient,
  userId: string,
) {
  const temporaryPassword = crypto.randomBytes(10).toString("hex");
  const password = await hashPassword(temporaryPassword);
  const account = await db.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true },
  });

  if (account) {
    await db.account.update({ where: { id: account.id }, data: { issuer: "local:credential", password } });
  } else {
    await db.account.create({
      data: {
        accountId: userId,
        id: crypto.randomBytes(16).toString("hex"),
        issuer: "local:credential",
        password,
        providerId: "credential",
        userId,
      },
    });
  }

  await db.user.update({ where: { id: userId }, data: { mustChangePassword: true } });
  return temporaryPassword;
}