import { useState } from 'react';
import { ArrowDown, ArrowUp, Gear, X } from '@phosphor-icons/react';
import { MagicBento } from '../../components/ui/MagicBento/MagicBento';
import { SettingsForm } from './SettingsForm';
import { SIZE_LABELS } from './layout';
import { WidgetFrame } from './WidgetFrame';

// One widget's edit controls: move up/down, size, settings, remove. (Drag and drop comes later;
// the buttons stay as the keyboard route.)
function Toolbar({ entry, index, count, onMove, onSize, onRemove, onSettings, open, onToggle }) {
  const { def, item, size, settings } = entry;
  return (
    <div className="widget-toolbar" role="toolbar" aria-label={`${def.title} controls`}>
      <span className="widget-toolbar__name">{def.title}</span>
      <div className="widget-toolbar__group" role="group" aria-label="Size">
        {def.sizes.map((s) => (
          <button key={s} type="button" className={`chip${size === s ? ' is-active' : ''}`} aria-pressed={size === s} onClick={() => onSize(item.key, s)} title={SIZE_LABELS[s]}>{s === 'full' ? 'Full' : s.toUpperCase()}</button>
        ))}
      </div>
      <div className="widget-toolbar__group">
        <button type="button" className="icon-button" aria-label={`Move ${def.title} up`} disabled={index === 0} onClick={() => onMove(item.key, -1)}><ArrowUp size={15} /></button>
        <button type="button" className="icon-button" aria-label={`Move ${def.title} down`} disabled={index === count - 1} onClick={() => onMove(item.key, 1)}><ArrowDown size={15} /></button>
        {def.settings.length > 0 && <button type="button" className={`icon-button${open ? ' is-active' : ''}`} aria-label={`${def.title} settings`} aria-expanded={open} onClick={onToggle}><Gear size={15} /></button>}
        <button type="button" className="icon-button" aria-label={`Remove ${def.title}`} onClick={() => onRemove(item.key)}><X size={15} /></button>
      </div>
      {open && (
        <div className="widget-toolbar__settings">
          <SettingsForm schema={def.settings} values={settings} idPrefix={`s-${item.key}`} onChange={(next) => onSettings(item.key, next)} />
        </div>
      )}
    </div>
  );
}

/** The board: a size-aware grid of widgets. In edit mode each shows its controls above it. */
export function DashboardBoard({ entries, editing, onMove, onSize, onRemove, onSettings }) {
  const [openSettings, setOpenSettings] = useState(null);
  return (
    <MagicBento
      className={editing ? 'is-editing' : ''}
      items={entries.map((entry, index) => {
        const { def, item, size, settings } = entry;
        const Component = def.component;
        return {
          id: item.key,
          size,
          module: def.module,
          content: (
            <>
              {editing && (
                <Toolbar
                  entry={entry} index={index} count={entries.length} onMove={onMove} onSize={onSize} onRemove={onRemove}
                  onSettings={onSettings} open={openSettings === item.key} onToggle={() => setOpenSettings((k) => (k === item.key ? null : item.key))}
                />
              )}
              {/* While editing, the widget is a picture: its own links and buttons shouldn't fire. */}
              <div className={editing ? 'widget-body is-editing' : 'widget-body'} inert={editing || undefined}>
                <WidgetFrame title={def.title}><Component settings={settings} size={size} /></WidgetFrame>
              </div>
            </>
          ),
        };
      })}
    />
  );
}
