import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type Session } from "@/lib/session";

/** Read + verify the current session inside a Server Component or route handler. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}
