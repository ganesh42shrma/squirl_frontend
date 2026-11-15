import './system.css';
import { DIFFICULTIES, RANK_NAMES } from './useTasks';

/** A dark "System" panel with corner brackets. `tone` is cyan (default), red, gold, violet or muted. */
export function SystemWindow({ title, tone, actions, children, className = '', as: Tag = 'section', ...rest }) {
  return (
    <Tag className={`sys-window ${className}`} data-tone={tone} {...rest}>
      {(title || actions) && (
        <div className="sys-head">
          {title && <h2 className="sys-title">{`[ ${title} ]`}</h2>}
          {actions}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** The rank hexagon. S, National and Apex glow (not under reduced motion). */
export function RankBadge({ rank = 'E', size = 56 }) {
  const glow = ['S', 'N', 'X'].includes(rank);
  return (
    <span className="rank-badge-wrap" data-rank={rank} data-glow={glow || undefined} role="img" aria-label={RANK_NAMES[rank] || rank}>
      <span className="rank-badge" data-rank={rank} style={{ '--size': `${size}px` }}>
        <span className="rank-badge__inner">{rank === 'N' ? 'N' : rank === 'X' ? '∞' : rank}</span>
      </span>
    </span>
  );
}

export function XpBar({ fraction = 0, left, right, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(fraction * 100)));
  return (
    <div className="sys-xp">
      <div className="sys-xp__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label || 'Experience'}>
        <span className="sys-xp__fill" style={{ width: `${pct}%` }} />
      </div>
      {(left || right) && <div className="sys-xp__label"><span>{left}</span><span>{right}</span></div>}
    </div>
  );
}

/** Difficulty tier as a small lettered badge (E..S) with its XP. */
export function DifficultyBadge({ difficulty, showXp = true }) {
  const tier = DIFFICULTIES.find((d) => d.id === difficulty) || DIFFICULTIES[2];
  return (
    <span className="diff-badge" data-badge={tier.badge} title={`${tier.label}: ${tier.hint}`}>
      <span className="diff-badge__letter" aria-hidden="true">{tier.badge}</span>
      {tier.label}{showXp && <span className="visually-hidden"> ({tier.xp} XP)</span>}
    </span>
  );
}
