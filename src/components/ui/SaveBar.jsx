import { Check, WarningCircle } from '@phosphor-icons/react';
import { Button } from './Button';
import { SAVE_TEXT, saveState } from '../../lib/settingsDraft';
import './ui.css';

/**
 * The bottom of a settings form: says whether what's on screen is saved, and only lets Save be pressed
 * when there is something to save. `submit` makes Save a form submit button; otherwise `onSave` runs.
 * `idleText` replaces "All changes saved" when nothing has ever been saved. `children` are extra buttons (like "Send test") that sit beside Save.
 */
export function SaveBar({ dirty, pending = false, error = false, invalid = false, onSave, submit = false, onDiscard, saveLabel = 'Save', idleText, children }) {
  const state = saveState({ dirty, pending, error });
  return (
    <div className="save-bar">
      <p className={`save-bar__status save-bar__status--${state}`} role="status">
        {state === 'saved' && !idleText && <Check size={14} weight="bold" aria-hidden="true" />}
        {state === 'error' && <WarningCircle size={14} weight="bold" aria-hidden="true" />}
        {state === 'saved' && idleText ? idleText : SAVE_TEXT[state]}
      </p>
      <div className="profile-form__actions">
        <Button type={submit ? 'submit' : 'button'} onClick={submit ? undefined : onSave} disabled={!dirty || pending || invalid}>
          {pending ? 'Saving…' : saveLabel}
        </Button>
        {dirty && !pending && onDiscard && <Button variant="quiet" onClick={onDiscard}>Discard</Button>}
        {children}
      </div>
    </div>
  );
}
