import { useState } from 'react';
import { Check, Lock, Medal } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { useAchievements, useEquipTitle, useTasksOverview } from './useTasks';
import './tasks.css';

const RARITY = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic' };
const GROUPS = { tasks: 'Tasks', quests: 'Daily Quest', streaks: 'Streaks and Echoes', rank: 'Rank and growth' };

function Award({ award, equipped, onEquip, pending }) {
  const unlocked = Boolean(award.unlockedAt);
  const pct = Math.round((award.progress.count / award.progress.target) * 100);
  return (
    <li className={`award is-${award.rarity}${unlocked ? ' is-unlocked' : ''}`}>
      <div className="award__icon" aria-hidden="true">{unlocked ? <Medal size={22} weight="fill" /> : <Lock size={20} />}</div>
      <div className="award__body">
        <h3>{award.name} <span className={`rarity rarity--${award.rarity}`}>{RARITY[award.rarity]}</span></h3>
        <p className="task-muted">{award.description}</p>
        {unlocked ? (
          <p className="award__status"><Check size={13} aria-hidden="true" /> Unlocked {new Date(award.unlockedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · +{award.xp} XP</p>
        ) : (
          <>
            <div className="award__bar" role="progressbar" aria-valuemin={0} aria-valuemax={award.progress.target} aria-valuenow={award.progress.count} aria-label={`${award.name} progress`}><span style={{ width: `${pct}%` }} /></div>
            <p className="task-muted award__count">{award.progress.count.toLocaleString('en-IN')} / {award.progress.target.toLocaleString('en-IN')} · {award.xp} XP</p>
          </>
        )}
      </div>
      {unlocked && <Button size="small" variant={equipped ? 'accent' : 'quiet'} disabled={pending} onClick={() => onEquip(equipped ? null : award.id)} aria-pressed={equipped}>{equipped ? 'Worn' : 'Wear title'}</Button>}
    </li>
  );
}

export function AwardsPage() {
  const { data, isLoading, isError, error } = useAchievements();
  const overview = useTasksOverview();
  const equip = useEquipTitle();
  const [filter, setFilter] = useState('all');
  if (isLoading) return <div className="insight-skeleton" />;
  if (isError) return <p className="import-error" role="alert">{describeError(error)}</p>;
  const worn = overview.data?.profile.title?.id;
  const visible = data.items.filter((a) => filter === 'all' || (filter === 'unlocked' ? a.unlockedAt : !a.unlockedAt));

  return (
    <div className="tasks-page">
      <header className="page-head"><h1>Awards</h1><p>{data.unlocked} of {data.total} unlocked. Each one pays XP once and can be worn as a title on your Hunter card.</p></header>
      <div className="chip-group" role="group" aria-label="Show awards">
        {[['all', 'All'], ['unlocked', 'Unlocked'], ['locked', 'Still locked']].map(([id, label]) => (
          <button key={id} type="button" className={`chip${filter === id ? ' is-active' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      {equip.isError && <p className="import-error" role="alert">{describeError(equip.error)}</p>}
      {Object.entries(GROUPS).map(([group, title]) => {
        const items = visible.filter((a) => a.group === group);
        if (!items.length) return null;
        return (
          <section key={group} className="awards-group" aria-label={title}>
            <h2 className="task-section__title">{title}</h2>
            <ul className="awards-grid" role="list">{items.map((a) => <Award key={a.id} award={a} equipped={worn === a.id} pending={equip.isPending} onEquip={(id) => equip.mutate(id)} />)}</ul>
          </section>
        );
      })}
      {!visible.length && <p className="task-empty">Nothing here yet. Finish a quest to start.</p>}
    </div>
  );
}
