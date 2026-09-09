import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readCurrentUserProfile } from "@/lib/current-user-profile";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const profile = await readCurrentUserProfile();
  const ownerReady = profile.roleKey === "owner" && Boolean(profile.clinicId);
  const employeeReady = Boolean(
    profile.roleKey &&
      profile.roleKey !== "owner" &&
      profile.clinicId &&
      profile.onboardingCompletedAt &&
      profile.emailVerified &&
      !profile.mustChangePassword
  );
  if (!ownerReady && !employeeReady) {
    return NextResponse.json({ error: "La bienvenida todavía no está disponible" }, { status: 409 });
  }
  await prisma.user.update({ where: { id: session.user.id }, data: { welcomeSeenAt: new Date() } });
  return NextResponse.json({ ok: true });
}
