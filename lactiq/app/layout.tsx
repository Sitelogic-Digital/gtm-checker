import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Barlow, Barlow_Semi_Condensed } from "next/font/google";
import { DESCRIPTION, EMAIL, INSTAGRAM_URL, SITE_URL, TAGLINE, TITLE, YOUTUBE_URL } from "@/lib/site";
import "./globals.css";

// Rebuild daily so the footer year stays current.
export const revalidate = 86400;

const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });
const display = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: SITE_URL, siteName: "Lactiq", locale: "en_GB", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#0B1220", colorScheme: "dark" };

const sameAs = [INSTAGRAM_URL, YOUTUBE_URL].filter(Boolean);
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Lactiq",
      url: SITE_URL,
      logo: `${SITE_URL}/icon`,
      slogan: TAGLINE,
      email: EMAIL,
      ...(sameAs.length ? { sameAs } : {}),
    },
    { "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: "Lactiq", url: SITE_URL, inLanguage: "en-GB", publisher: { "@id": `${SITE_URL}/#org` } },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <html lang="en-GB" className={`${body.variable} ${display.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
          Skip to content
        </a>
        {children}
        <footer className="border-t border-line">
          <div className="wrap py-12 text-[15px] text-text-2">
            <p className="max-w-[60ch]">
              Lactiq™ is a trading name of [Company] Ltd, registered in England. For sports and training use only; not a medical device supplier.
            </p>
            <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
              <a className="link" href={`mailto:${EMAIL}`}>{EMAIL}</a>
              <span aria-hidden>·</span>
              <a className="link" href="/privacy">Privacy</a>
              <span aria-hidden>·</span>
              <a className="link" href={INSTAGRAM_URL || "https://www.instagram.com/"} rel="noopener">Instagram</a>
              <span aria-hidden>·</span>
              <a className="link" href={YOUTUBE_URL || "https://www.youtube.com/"} rel="noopener">YouTube</a>
            </p>
            <p className="mt-4 text-muted">© {year} Lactiq</p>
          </div>
        </footer>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {plausible ? <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" strategy="afterInteractive" /> : null}
      </body>
    </html>
  );
}
