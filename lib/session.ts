import { createHash } from "node:crypto";
import { cookies } from "next/headers";

// The API token lives in an httpOnly cookie: page scripts can't read it, and
// the server can fetch a page's data before sending it.

const TOKEN_COOKIE = "wallet_token";

export async function readToken() {
  return (await cookies()).get(TOKEN_COOKIE)?.value || null;
}

export async function writeToken(token: string | null) {
  const store = await cookies();
  if (!token) {
    store.delete(TOKEN_COOKIE);
    return;
  }
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * A stable, non-secret stand-in for the token. The client scopes its cached
 * queries by it, so switching tokens never shows the previous account's data.
 */
export function sessionKey(token: string) {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

export function maskToken(token: string) {
  if (token.length <= 8) return "•".repeat(token.length);
  return `${token.slice(0, 4)}${"•".repeat(8)}${token.slice(-4)}`;
}
