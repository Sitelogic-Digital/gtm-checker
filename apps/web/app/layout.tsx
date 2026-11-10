import type { ReactNode } from 'react';
import { DEFAULT_THEME, THEME_BOOT } from '../lib/theme';
import './styles/tokens.css';
import './styles/sitelogic-components.css';
import './styles/app.css';

export const metadata = {
  title: 'GTM Auditor',
  description: 'Reads a GTM container export, explains it in plain English and flags what will break your GA4 data.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Light (Bone) by default; the Dark mode switch picks Ink and is remembered in this browser.
  return (
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
