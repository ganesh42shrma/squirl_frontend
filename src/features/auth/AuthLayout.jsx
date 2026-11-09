import { useState } from 'react';
import { Logo } from '../../components/layout/Logo';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { GrowingAcorns } from '../../components/illustrations/Sketches';
import '../../components/ui/ui.css';
import './auth.css';

// Shared frame for sign-in, sign-up and password pages: the same paper and type as the app.
export function AuthLayout({ title, intro, children, footer }) {
  return (
    <div className="auth">
      <header className="auth__nav">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="auth__main">
        <div className="auth__art" aria-hidden="true">
          <GrowingAcorns size={220} />
        </div>
        <section className="auth__card" aria-labelledby="auth-title">
          <h1 id="auth-title">{title}</h1>
          {intro && <p className="auth__intro">{intro}</p>}
          {children}
          {footer && <div className="auth__footer">{footer}</div>}
        </section>
      </main>
    </div>
  );
}

// Password input with a show/hide toggle.
export function PasswordField({ label, value, onChange, autoComplete, hint, autoFocus }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      {label}
      <span className="auth__password">
        <input
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          className="auth__reveal"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {hint && <span className="auth__hint">{hint}</span>}
    </label>
  );
}

// Only ever return to a page inside the app (never an arbitrary URL from the query string).
export function safeNext(params) {
  const next = params.get('next') || '';
  return next.startsWith('/app') && !next.startsWith('//') ? next : '/app';
}
