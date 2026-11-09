import type { Metadata } from "next";
import Waitlist from "@/components/Waitlist";

export const metadata: Metadata = {
  title: "Build-log — Lactiq",
  description: "Building Lactiq in public. First post this month.",
  alternates: { canonical: "/log" },
};

export default function Log() {
  return (
    <>
      <header className="wrap pt-6 md:pt-8">
        <a href="/" className="display text-[28px] font-bold leading-none tracking-[-0.02em] no-underline" aria-label="Lactiq home">
          Lactiq
        </a>
      </header>
      <main id="main" className="wrap section">
        <h1 className="text-[36px] leading-[1.05] md:text-[56px]">Building in public</h1>
        <p className="mt-6 text-text-2">First post this month.</p>
        <p className="mt-2 text-text-2">Join the waiting list and tick the build-log box to get each post by email.</p>
        <div className="mt-8">
          <Waitlist id="log-waitlist" />
        </div>
      </main>
    </>
  );
}
