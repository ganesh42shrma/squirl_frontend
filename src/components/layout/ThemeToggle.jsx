import { useEffect, useState } from 'react';
import { Moon, Sun } from '@phosphor-icons/react';

const STORAGE_KEY = 'squirl-theme';

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Follows the system until you pick one; your pick is remembered in this browser.
export function ThemeToggle() {
  const [theme, setTheme] = useState(() => readStoredTheme() || systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage blocked: the choice just won't persist */
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}
