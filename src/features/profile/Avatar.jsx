import { useEffect, useState } from 'react';
import { mediaFileUrl } from '../media/useMedia';
import './profile.css';

export const initialsOf = (name = '') =>
  name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

// The person's picture, or their initials when they have none (or it can't be loaded right now).
export function Avatar({ name, mediaId, large = false, xl = false }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [mediaId]);
  return (
    <span className={`avatar${large ? ' avatar--large' : ''}${xl ? ' avatar--xl' : ''}`} aria-hidden="true">
      {mediaId && !failed ? <img className="avatar__img" src={mediaFileUrl(mediaId)} alt="" onError={() => setFailed(true)} /> : initialsOf(name)}
    </span>
  );
}
