import { type ReactElement, useEffect, useState } from 'react';
import { UI_COPY } from '../constants/uiTheme.ts';
import { MoonIcon, SunIcon } from './Icons.tsx';

const THEME_STORAGE_KEY = 'air-assistant-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';
const DARK_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const LIGHT_BUTTON_LABEL = 'Light';
const DARK_BUTTON_LABEL = 'Dark';

function readInitialDarkPreference(): boolean {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === DARK_THEME) return true;
    if (saved === LIGHT_THEME) return false;
  } catch {
    // Ignore storage access errors in restricted iframes.
  }
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_COLOR_SCHEME_QUERY).matches
    : false;
}

/**
 * Accessible light/dark theme switcher respecting system prefers-color-scheme on first load.
 */
export function ThemeToggle(): ReactElement {
  const [isDark, setIsDark] = useState<boolean>(readInitialDarkPreference);

  useEffect(() => {
    document.documentElement.classList.toggle(DARK_THEME, isDark);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? DARK_THEME : LIGHT_THEME);
    } catch {
      // Ignore storage persistence failures.
    }
  }, [isDark]);

  const label = isDark ? UI_COPY.THEME_TOGGLE_LIGHT : UI_COPY.THEME_TOGGLE_DARK;

  return (
    <button
      type="button"
      onClick={() => {
        setIsDark((prev) => !prev);
      }}
      aria-label={label}
      aria-pressed={isDark}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-xs transition-colors duration-150 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {isDark ? <SunIcon className="h-5 w-5 text-amber-400" /> : <MoonIcon className="h-5 w-5" />}
      <span className="hidden sm:inline">{isDark ? LIGHT_BUTTON_LABEL : DARK_BUTTON_LABEL}</span>
    </button>
  );
}
