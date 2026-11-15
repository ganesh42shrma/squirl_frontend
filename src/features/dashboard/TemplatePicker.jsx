import { ArrowRight } from '@phosphor-icons/react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { DASHBOARD_TEMPLATES } from './templates';
import { WIDGET_BY_ID } from './registry';

export function TemplatePicker({ onChoose, onClose }) {
  return (
    <Dialog title="Choose a dashboard template" onClose={onClose} wide>
      <div className="template-picker">
        <p className="member-hint">Ready-to-use widgets, sizes, and settings. Choose a starting point, then make it yours.</p>
        <ul className="template-grid" role="list">
          {DASHBOARD_TEMPLATES.map((template) => (
            <li key={template.id} className="template-card">
              <div className="template-card__preview" aria-hidden="true">
                <div className="template-card__board">
                  {template.items.map((item) => (
                    <span key={item.widget} className={`template-card__tile is-${item.size}`} data-module={WIDGET_BY_ID.get(item.widget).module}>
                      <span>{WIDGET_BY_ID.get(item.widget).title}</span>
                      <i /><i />
                    </span>
                  ))}
                </div>
              </div>
              <div className="template-card__body">
                <p className="template-card__label">{template.label}</p>
                <h3>{template.name}</h3>
                <p className="member-hint">{template.description}</p>
                <p className="template-card__detail">{template.items.length} widgets · {template.detail}</p>
                <Button variant="quiet" size="small" onClick={() => onChoose(template)}>
                  Use {template.name} <ArrowRight size={14} aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="member-hint">A template replaces the widgets in your current draft. Choose Save dashboard to keep it, or Discard to restore your saved layout.</p>
      </div>
    </Dialog>
  );
}
