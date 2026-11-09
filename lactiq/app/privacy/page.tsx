import type { Metadata } from "next";
import { EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy — Lactiq",
  description: "What Lactiq stores when you join the waiting list, why, and how to be removed.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <>
      <header className="wrap pt-6 md:pt-8">
        <a href="/" className="display text-[28px] font-bold leading-none tracking-[-0.02em] no-underline" aria-label="Lactiq home">
          Lactiq
        </a>
      </header>
      <main id="main" className="wrap section">
        <h1 className="text-[36px] leading-[1.05] md:text-[56px]">Privacy</h1>
        <div className="mt-8 grid max-w-[60ch] gap-6">
          <section>
            <h2 className="text-[24px]">What we store</h2>
            <p className="mt-2 text-text-2">
              Your email address, the time you signed up, and whether you ticked the weekly build-log box. Nothing else.
            </p>
          </section>
          <section>
            <h2 className="text-[24px]">Why</h2>
            <p className="mt-2 text-text-2">
              To email you once when Lactiq launches, and to send the build-log if you asked for it. You gave us your address
              for that, and we use it for nothing else. We never sell or share it.
            </p>
          </section>
          <section>
            <h2 className="text-[24px]">Who handles it</h2>
            <p className="mt-2 text-text-2">
              Resend sends our emails, a Google Sheet holds the list, and Vercel hosts this site. This site uses Plausible
              analytics, which sets no cookies and records no personal data.
            </p>
          </section>
          <section>
            <h2 className="text-[24px]">How to be removed</h2>
            <p className="mt-2 text-text-2">
              Use the unsubscribe link in any email from us, or email <a className="underline" href={`mailto:${EMAIL}`}>{EMAIL}</a> and
              we’ll delete your details. You can also ask to see what we hold. If you’re unhappy with how we’ve handled your data,
              you can complain to the Information Commissioner’s Office.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
