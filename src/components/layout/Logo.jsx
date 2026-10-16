import { Link } from 'react-router-dom';
import './layout.css';

export function AcornMark({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 14c0 7 3.5 12 8 14 4.5-2 8-7 8-14" fill="var(--clay)" />
      <path d="M6 14c0-4 4.5-6.5 10-6.5S26 10 26 14H6z" fill="var(--kraft)" />
      <path d="M16 7.5c0-2 1-3.5 3-4.5" />
    </svg>
  );
}

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="Squirl home">
      <AcornMark />
      <span className="logo__word">squirl</span>
    </Link>
  );
}
