import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: headers(),
    cookies: cookies(),
  });

  if (!session?.user) return null;
  return session;
}
