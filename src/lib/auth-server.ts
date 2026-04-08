import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function requireSession() {
  const requestHeaders = await headers();
  await cookies();

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session?.user) return null;
  return session;
}
