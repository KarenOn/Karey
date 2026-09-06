import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await prisma.user.update({ where: { id: session.user.id }, data: { welcomeSeenAt: new Date() } });
  return NextResponse.json({ ok: true });
}