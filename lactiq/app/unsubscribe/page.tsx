import type { Metadata } from "next";
import { EMAIL } from "@/lib/site";
import UnsubscribeForm from "./UnsubscribeForm";

export const metadata: Metadata = { title: "Unsubscribe — Lactiq", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ e?: string; t?: string }> }) {
  const { e, t } = await searchParams;
  return (
    <>
      <header className="wrap pt-6 md:pt-8">
        <a href="/" className="display text-[28px] font-bold leading-none tracking-[-0.02em] no-underline" aria-label="Lactiq home">
          Lactiq
        </a>
      </header>
      <main id="main" className="wrap section">
        <h1 className="text-[36px] leading-[1.05] md:text-[56px]">Unsubscribe</h1>
        <div className="mt-8">
          {e && t ? (
            <UnsubscribeForm email={e} token={t} />
          ) : (
            <p className="text-text-2">
              This link is incomplete. Email <a className="underline" href={`mailto:${EMAIL}`}>{EMAIL}</a> and we’ll remove you.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
