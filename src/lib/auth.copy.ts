import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { getAppBaseUrl, sendVerificationEmail as sendVerificationEmailMessage } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  baseURL: getAppBaseUrl(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        input: false,
      },
      banned: {
        type: "boolean",
        required: false,
        input: false,
      },
      banReason: {
        type: "string",
        required: false,
        input: false,
      },
      banExpires: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  session: {
    additionalFields: {
      impersonatedBy: {
        type: "string",
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  emailVerification: {
    expiresIn: 60 * 60 * 24,
    async sendVerificationEmail({ url, user }) {
      await sendVerificationEmailMessage({
        to: user.email,
        userName: user.name,
        verifyUrl: url,
      });
    },
  },
  plugins: [nextCookies()],
});

export async function getSessionUserOrNull() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

export async function getActiveClinicMembershipForUser(userId: string) {
  return prisma.clinicMember.findFirst({
    where: {
      userId,
      isActive: true,
      role: { is: { isActive: true } },
    },
    include: {
      clinic: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          mobile: true,
          owner: true,
          logoUrl: true,
          isActive: true,
          subscriptionStatus: true,
          subscriptionEndDate: true,
          plan: true,
        },
      },
      role: {
        select: {
          id: true,
          key: true,
          name: true,
          permissions: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getCurrentClinicMembership() {
  const user = await getSessionUserOrNull();
  if (!user?.id) {
    return null;
  }

  return getActiveClinicMembershipForUser(user.id);
}

export const getClinicIdOrFail = async () => {
  const user = await getSessionUserOrNull();
  if (!user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  const membership = await getActiveClinicMembershipForUser(user.id);
  if (membership?.clinicId) {
    if (!membership.clinic.isActive) {
      throw new Error("CLINIC_INACTIVE");
    }
    return membership.clinicId;
  }

  throw new Error("NO_CLINIC");
};
