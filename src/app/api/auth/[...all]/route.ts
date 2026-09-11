import { authHandler } from "@/lib/auth";

export const runtime = "nodejs";

export const { GET, POST } = authHandler;
