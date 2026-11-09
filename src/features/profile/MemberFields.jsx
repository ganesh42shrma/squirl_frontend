export const emptyMember = { name: '', phone: '', relationship: '', aliases: '' };
const localPhone = (value = '') => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 14 && digits.startsWith('0091')) return digits.slice(4);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};
export const memberDraft = (c = {}) => ({ ...emptyMember, ...c, phone: localPhone(c.phone), aliases: (c.aliases || []).join(', ') });
export const memberBody = (f) => ({ name: f.name.trim(), phone: f.phone.trim(), relationship: f.relationship, aliases: [...new Set(f.aliases.split(',').map((a) => a.trim()).filter(Boolean))] });
const RELATIONSHIPS = ['Mother', 'Father', 'Spouse', 'Partner', 'Brother', 'Sister', 'Child', 'Relative', 'Friend', 'Other'];

export function MemberFields({ value, onChange }) {
  const set = (key) => (e) => onChange((prev) => ({ ...prev, [key]: e.target.value }));
  return (
    <>
      <label className="field">Name
        <input className="input" autoFocus required minLength={2} maxLength={80} value={value.name} onChange={set('name')} />
      </label>
      <div className="field">
        <label htmlFor="member-phone">Phone <span className="member-optional">Optional</span></label>
        <div className="member-phone">
          <input className="input member-phone__code" value="+91" disabled aria-label="Country code" />
          <input id="member-phone" className="input" type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={value.phone} onChange={(e) => onChange((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))} placeholder="10-digit mobile number" title="Enter a 10-digit Indian mobile number" />
        </div>
      </div>
      <label className="field">Relationship
        <select className="select" value={value.relationship} onChange={set('relationship')}>
          <option value="">Choose relationship</option>
          {value.relationship && !RELATIONSHIPS.includes(value.relationship) && <option value={value.relationship}>{value.relationship}</option>}
          {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <label className="field"><span>Alternate names <span className="member-optional">Optional</span></span>
        <input className="input" value={value.aliases} onChange={set('aliases')} placeholder="Statement names, separated by commas" />
      </label>
    </>
  );
}
