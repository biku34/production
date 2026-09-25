import type { Role, Stage } from "@/lib/domain";

/**
 * Signed session token (HMAC-SHA256 via Web Crypto) — works in both the Edge
 * middleware runtime and the Node route handlers, so we can gate pages in
 * middleware and read the same session in API routes without a heavy JWT dep.
 */

export const SESSION_COOKIE = "fp_session";
export const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12h shift-ish

const SECRET =
  process.env.AUTH_SECRET || "fabric-plant-dev-secret-change-in-production";

export interface Session {
  uid: string;
  name: string;
  username: string;
  role: Role;
  stages?: Stage[];
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesFromB64url(str: string): Uint8Array<ArrayBuffer> {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(
  payload: Omit<Session, "iat" | "exp">
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: Session = { ...payload, iat: now, exp: now + SESSION_TTL_SECONDS };
  const body = b64urlFromBytes(encoder.encode(JSON.stringify(full)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(body));
  return `${body}.${b64urlFromBytes(new Uint8Array(sig))}`;
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      bytesFromB64url(sig),
      encoder.encode(body)
    );
    if (!valid) return null;
    const session = JSON.parse(decoder.decode(bytesFromB64url(body))) as Session;
    if (session.exp && session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}
