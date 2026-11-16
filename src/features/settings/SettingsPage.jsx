import { Link, Navigate, NavLink, useLocation, useParams } from 'react-router-dom';
import { ArrowUpRight, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useIsMobile } from '../../hooks/useMedia';
import { useProfile } from '../auth/useAuth';
import { Avatar } from '../profile/Avatar';
import { PROFILE_PATH, settingsPath } from '../../app/paths';
import { LEGACY_HASHES, SETTINGS_GROUPS, settingsItem } from './sections';
import '../profile/profile.css';
import '../commitments/commitments.css';
import './settings.css';


function ItemLink({ item, rich }) {
  const Icon = item.icon;
  const external = Boolean(item.to);
  const className = `settings-nav__item${item.danger ? ' is-danger' : ''}`;
  const body = (
    <>
      <span className="settings-nav__icon" aria-hidden="true"><Icon size={20} /></span>
      <span className="settings-nav__text">
        <span className="settings-nav__label">{item.label}</span>
        {rich && <span className="settings-nav__blurb">{item.blurb}</span>}
      </span>
      {external ? <ArrowUpRight className="settings-nav__end" size={16} aria-hidden="true" />
        : rich && <CaretRight className="settings-nav__end" size={16} aria-hidden="true" />}
    </>
  );
  return external
    ? <Link to={item.to} className={className}>{body}</Link>
    : <NavLink to={settingsPath(item.id)} className={className}>{body}</NavLink>;
}

// The grouped menu: a sticky rail on desktop, the whole screen on a phone (rich rows with blurbs).
function SettingsMenu({ rich }) {
  return (
    <nav className={`settings-nav${rich ? ' settings-nav--rich' : ''}`} aria-label="Settings">
      {SETTINGS_GROUPS.map((group) => (
        <div className="settings-nav__group" key={group.label} role="group" aria-labelledby={`settings-group-${group.label}`}>
          <p className="settings-nav__heading" id={`settings-group-${group.label}`}>{group.label}</p>
          <div className="settings-nav__list">
            {group.items.map((item) => <ItemLink key={item.id} item={item} rich={rich} />)}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ProfileCard() {
  const { data: profile } = useProfile();
  if (!profile) return null;
  return (
    <Link to={PROFILE_PATH} className="settings-card">
      <Avatar name={profile.name} mediaId={profile.avatarMediaId} large />
      <span className="settings-card__text"><strong>{profile.name}</strong><span>{profile.email}</span></span>
      <CaretRight size={18} aria-hidden="true" />
    </Link>
  );
}

function SectionPage({ item }) {
  const { data: profile, isLoading, isError, error } = useProfile();
  const Page = item.page;
  if (item.needsProfile) {
    if (isLoading) return <div className="insight-skeleton" />;
    if (isError) return <p className="import-error">{error.message}</p>;
  }
  return (
    <div className={`settings__content${item.single ? ' settings__content--single' : ''}`}>
      {item.id !== 'profile' && <h2 className="settings__title">{item.label}</h2>}
      <Page profile={profile} />
    </div>
  );
}

export function SettingsPage() {
  const { section } = useParams();
  const isMobile = useIsMobile();
  const item = section ? settingsItem(section) : null;
  if (section && !item) return <Navigate to={settingsPath()} replace />;

  if (isMobile) {
    if (!item) {
      return (
        <div className="settings settings--mobile">
          <h1 className="visually-hidden">Settings</h1>
          <ProfileCard />
          <SettingsMenu rich />
        </div>
      );
    }
    return (
      <div className="settings settings--mobile">
        <h1 className="visually-hidden">Settings</h1>
        <Link to={settingsPath()} className="settings__back"><CaretLeft size={18} aria-hidden="true" />Settings</Link>
        <SectionPage item={item} />
      </div>
    );
  }

  // Desktop: the menu stays beside the page; /settings itself opens Profile.
  if (!item) return <Navigate to={PROFILE_PATH} replace />;
  return (
    <div className="settings">
      <aside className="settings__rail">
        <h1 className="settings__heading">Settings</h1>
        <SettingsMenu />
      </aside>
      <SectionPage item={item} key={item.id} />
    </div>
  );
}

// /app/profile and its old #anchors.
export function LegacyProfileRedirect() {
  const { hash } = useLocation();
  return <Navigate to={settingsPath(LEGACY_HASHES[hash] || 'profile')} replace />;
}
