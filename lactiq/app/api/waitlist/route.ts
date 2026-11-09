import { NextResponse } from "next/server";
import { EMAIL_RE, appendRow, clientIp, notify, rateLimited, sendEmail, unsubUrl } from "@/lib/server";
import { EMAIL } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (rateLimited(`wl:${clientIp(req)}`)) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  let body: { email?: unknown; buildLog?: unknown; company?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: bots fill the hidden field. Pretend success.
  if (typeof body.company === "string" && body.company.trim()) return NextResponse.json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const buildLog = body.buildLog === true;

  try {
    await appendRow({ action: "subscribe", email, buildLog, timestamp: new Date().toISOString() });
    await Promise.all([
      sendEmail({
        to: email,
        subject: "You're on the Lactiq waiting list",
        text: [
          "Thanks for joining the Lactiq waiting list.",
          "",
          "You'll get one email when we launch for the spring marathon season.",
          buildLog ? "You've also opted in to the weekly build-log." : "You haven't opted in to the weekly build-log. You can reply to say you'd like it.",
          "",
          "Charlie, founder",
          "",
          `Changed your mind? Unsubscribe here: ${unsubUrl(email)}`,
          `Or reply to this email and we'll remove you. Questions: ${EMAIL}`,
        ].join("\n"),
        headers: { "List-Unsubscribe": `<${unsubUrl(email)}>` },
      }),
      notify("New Lactiq waiting-list signup", `${email}\nBuild-log: ${buildLog ? "yes" : "no"}\n${new Date().toISOString()}`),
    ]);
  } catch (err) {
    console.error("waitlist error", err);
    return NextResponse.json({ error: "Something went wrong on our side. Please try again shortly." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
