import { createHmac, timingSafeEqual } from "node:crypto";
import { EMAIL, SITE_URL } from "./site";

const FROM = process.env.RESEND_FROM || `Lactiq <${EMAIL}>`;
const NOTIFY = process.env.NOTIFY_EMAIL || EMAIL;
const isDev = process.env.NODE_ENV !== "production";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- rate limit (per instance, best effort) ---------- */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return recent.length > max;
}

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/* ---------- unsubscribe tokens ---------- */
function secret() {
  const s = process.env.UNSUBSCRIBE_SECRET;
  if (!s && !isDev) throw new Error("UNSUBSCRIBE_SECRET is not set");
  return s || "dev-secret";
}
export function unsubToken(email: string) {
  return createHmac("sha256", secret()).update(email.toLowerCase()).digest("hex");
}
export function verifyUnsubToken(email: string, token: string) {
  const a = Buffer.from(unsubToken(email));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function unsubUrl(email: string) {
  return `${SITE_URL}/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;
}

/* ---------- Resend (REST, no SDK) ---------- */
export async function sendEmail(opts: { to: string; subject: string; text: string; headers?: Record<string, string> }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (isDev) {
      console.log(`[dev] email to ${opts.to}: ${opts.subject}\n${opts.text}`);
      return;
    }
    throw new Error("RESEND_API_KEY is not set");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, ...opts }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
export const notify = (subject: string, text: string) => sendEmail({ to: NOTIFY, subject, text });

/* ---------- Google Sheet webhook ---------- */
export async function appendRow(row: Record<string, string | boolean>) {
  const url = process.env.SHEET_WEBHOOK_URL;
  if (!url) {
    if (isDev) {
      console.log("[dev] sheet row", row);
      return;
    }
    throw new Error("SHEET_WEBHOOK_URL is not set");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: process.env.SHEET_WEBHOOK_SECRET ?? "", ...row }),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Sheet webhook ${res.status}`);
}
