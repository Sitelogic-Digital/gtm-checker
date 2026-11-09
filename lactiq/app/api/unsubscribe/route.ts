import { NextResponse } from "next/server";
import { EMAIL_RE, appendRow, clientIp, notify, rateLimited, verifyUnsubToken } from "@/lib/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (rateLimited(`un:${clientIp(req)}`, 10)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }
  let body: { email?: unknown; token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const token = typeof body.token === "string" ? body.token : "";
  if (!EMAIL_RE.test(email) || !token || !verifyUnsubToken(email, token)) {
    return NextResponse.json({ error: "This link isn't valid. Email hello@lactiq.co.uk and we'll remove you." }, { status: 400 });
  }
  try {
    await appendRow({ action: "unsubscribe", email, buildLog: false, timestamp: new Date().toISOString() });
    await notify("Lactiq unsubscribe", `${email} unsubscribed.`);
  } catch (err) {
    console.error("unsubscribe error", err);
    return NextResponse.json({ error: "Something went wrong. Email hello@lactiq.co.uk and we'll remove you." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
