import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path
import { prisma } from "@/lib/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins"; // 👈

// const prisma = new PrismaClient();
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "mysql", // ✅ ahora MySQL
    }),
    emailAndPassword: {    
        enabled: true
    },
    plugins: [nextCookies(), admin({
      adminRoles: ["admin"], // default
      // opcional: adminUserIds: ["..."] si quieres
    })]
});

export const getClinicIdOrFail = async () => {
  const clinic = await prisma.clinic.findFirst({ select: { id: true } });
  if (!clinic) {
    throw new Error("No se pudo identificar la clinica activa");
  }

  return clinic.id;
};
