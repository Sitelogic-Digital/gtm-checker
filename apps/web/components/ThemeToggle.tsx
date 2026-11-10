'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_THEME, THEME_KEY, type Theme } from '../lib/theme';

/** A real on/off switch: "Dark mode", off by default (Bone). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'ink' ? 'ink' : 'bone');
  }, []);
  const dark = theme === 'ink';
  const set = (next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: the choice just won't persist */
    }
    setTheme(next);
  };
  return (
    <button type="button" role="switch" aria-checked={dark} className="switch" onClick={() => set(dark ? 'bone' : 'ink')}>
      <span className="switch-track" aria-hidden="true">
        <span className="switch-knob" />
      </span>
      <span className="switch-label">Dark mode</span>
    </button>
  );
}
