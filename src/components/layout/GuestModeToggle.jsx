import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useGuestMode } from '../../lib/useGuestMode';

export function GuestModeToggle() {
  const { guestMode, toggleGuestMode } = useGuestMode();
  const label = guestMode ? 'Turn off guest mode and show amounts' : 'Turn on guest mode and hide amounts';
  return <button type="button" className={`guest-mode-toggle${guestMode ? ' is-active' : ''}`} onClick={toggleGuestMode} aria-label={label} aria-pressed={guestMode} title={label}>
    {guestMode ? <EyeSlash size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}<span>Guest mode</span>
  </button>;
}
