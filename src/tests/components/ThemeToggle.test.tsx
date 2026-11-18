import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '../../components/ThemeToggle.tsx';
import { UI_COPY } from '../../constants/uiTheme.ts';

const THEME_STORAGE_KEY = 'air-assistant-theme';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('ThemeToggle', () => {
  it('reads stored dark preference, toggles .dark class, and persists to localStorage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(<ThemeToggle />);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    const toLightBtn = screen.getByRole('button', { name: UI_COPY.THEME_TOGGLE_LIGHT });
    expect(toLightBtn.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(toLightBtn);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(
      screen.getByRole('button', { name: UI_COPY.THEME_TOGGLE_DARK }).getAttribute('aria-pressed'),
    ).toBe('false');
  });
});
