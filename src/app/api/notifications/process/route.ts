import { NextResponse } from "next/server";
import { processQueuedNotifications } from "@/lib/reminders";

function isAuthorized(req: Request) {
  const cronHeader = req.headers.get("x-vercel-cron");
  if (cronHeader) {
    return true;
  }

  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    return false;
  }

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${configuredSecret}`;
}

export const runtime = "nodejs";

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const processed = await processQueuedNotifications(100);
  return NextResponse.json({
    ok: true,
    ...processed,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
