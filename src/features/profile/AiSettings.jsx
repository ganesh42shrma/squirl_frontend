import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { api, describeError } from '../../api/client';

const PROVIDERS = { anthropic: 'Claude (Anthropic)', openai: 'OpenAI (GPT / Codex)', google: 'Gemini (Google)', groq: 'Groq' };
const SHORT = { anthropic: 'Claude', openai: 'OpenAI · Codex', google: 'Gemini', groq: 'Groq' };
const KEY_HINTS = { anthropic: 'sk-ant-…', openai: 'sk-…', google: 'AIza…', groq: 'gsk_…' };
const KEY_PAGES = { anthropic: 'console.anthropic.com', openai: 'platform.openai.com', google: 'aistudio.google.com', groq: 'console.groq.com' };

/** Two switches for cloud models: web search (live prices) and schema-strict structured answers. */
function CloudOptions({ settings }) {
  const update = useUpdateAi();
  const toast = useToast();
  const toggle = (key, label) => (e) => update.mutate({ [key]: e.target.checked }, { onSuccess: (s) => toast(`${label} ${s[key] ? 'on' : 'off'}`) });
  return (
    <fieldset className="ai-options">
      <legend className="visually-hidden">Cloud model options</legend>
      <label className="goal-check">
        <input type="checkbox" checked={settings.webSearch} disabled={update.isPending} onChange={toggle('webSearch', 'Web search')} />
        <span>
          Search the web
          <span className="cm-optional">For live prices in goals. May cost extra.</span>
        </span>
      </label>
      <label className="goal-check">
        <input type="checkbox" checked={settings.strict} disabled={update.isPending} onChange={toggle('strict', 'Strict answers')} />
        <span>
          Strict answers
          <span className="cm-optional">More reliable goal setup.</span>
        </span>
      </label>
      <label className="goal-check">
        <input
          type="checkbox"
          checked={settings.guard.enabled}
          disabled={update.isPending || (!settings.guard.enabled && !settings.keys.groq.saved)}
          onChange={(e) => update.mutate({ guard: { enabled: e.target.checked } }, { onSuccess: (s) => toast(`Safety check ${s.guard.enabled ? 'on' : 'off'}`) })}
        />
        <span>
          Safety check
          <span className="cm-optional">
            {settings.keys.groq.saved ? 'Blocks suspicious text before it’s sent.' : 'Needs a Groq key.'}
          </span>
        </span>
      </label>
      {settings.guard.enabled && (
        <label className="field ai-guard-model">
          Guard model
          <select
            className="select"
            value={settings.guard.model}
            disabled={update.isPending}
            onChange={(e) => update.mutate({ guard: { model: e.target.value } }, { onSuccess: () => toast('Guard model saved') })}
          >
            <option value="meta-llama/llama-prompt-guard-2-22m">Prompt Guard 2 · 22M (fastest)</option>
            <option value="meta-llama/llama-prompt-guard-2-86m">Prompt Guard 2 · 86M (more accurate)</option>
          </select>
        </label>
      )}
    </fieldset>
  );
}

function useAiSettings() {
  return useQuery({ queryKey: ['ai', 'settings'], queryFn: () => api('/ai/settings').then((r) => r.data) });
}

function useUpdateAi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/ai/settings', { method: 'PATCH', body }).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['ai', 'settings'], data);
      queryClient.invalidateQueries({ queryKey: ['ai', 'models'] });
      queryClient.invalidateQueries({ queryKey: ['insights', 'llm'] });
    },
  });
}

function ProviderKey({ provider, settings }) {
  const update = useUpdateAi();
  const toast = useToast();
  const [key, setKey] = useState('');
  const [replacing, setReplacing] = useState(false);
  const saved = settings.keys[provider];
  const inUse = settings.mode === 'api' && settings.provider === provider;
  const models = useQuery({
    queryKey: ['ai', 'models', provider],
    queryFn: () => api('/ai/models', { query: { provider } }).then((r) => r.data.models),
    enabled: saved.saved,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const test = useMutation({ mutationFn: () => api('/ai/test', { method: 'POST', body: { provider } }).then((r) => r.data) });

  const saveKey = (e) => {
    e.preventDefault();
    update.mutate({ keys: { [provider]: key.trim() } }, { onSuccess: () => (setKey(''), setReplacing(false), toast('Key saved')) });
  };

  const current = settings.models[provider];
  const list = models.data || [];
  const options = current && !list.includes(current) ? [current, ...list] : list;

  return (
    <div className="ai-provider">
      {saved.saved && !replacing ? (
        <p className="ai-key">
          Key saved (…{saved.last4})
          <button type="button" className="link-button" onClick={() => setReplacing(true)}>Replace</button>
          <button
            type="button"
            className="link-button"
            disabled={inUse || update.isPending}
            title={inUse ? 'Switch to this computer first' : undefined}
            onClick={() => update.mutate({ keys: { [provider]: null } }, { onSuccess: () => toast('Key removed') })}
          >
            Remove
          </button>
        </p>
      ) : (
        <form className="ai-key-form" onSubmit={saveKey}>
          <label className="field">
            {PROVIDERS[provider]} key
            <input
              className="input"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={KEY_HINTS[provider]}
              autoComplete="off"
              spellCheck={false}
              required
              minLength={10}
            />
            <span className="cm-optional">Get one at {KEY_PAGES[provider]}</span>
          </label>
          <div className="profile-form__actions">
            <Button type="submit" variant="quiet" disabled={update.isPending || key.trim().length < 10}>{update.isPending ? 'Saving…' : 'Save key'}</Button>
            {replacing && <Button variant="quiet" onClick={() => (setReplacing(false), setKey(''))}>Cancel</Button>}
          </div>
        </form>
      )}

      {saved.saved && (
        <div className="ai-model-row">
          <label className="field">
            Model
            <select
              className="select"
              value={current || ''}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ models: { [provider]: e.target.value } }, { onSuccess: () => toast('Model saved') })}
            >
              {!current && <option value="">{models.isLoading ? 'Loading models…' : 'Choose a model'}</option>}
              {options.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {models.isError && <span className="import-error">{describeError(models.error)}</span>}
          </label>
          <Button variant="quiet" disabled={test.isPending || !current} onClick={() => test.mutate()}>
            {test.isPending ? 'Testing…' : 'Test connection'}
          </Button>
        </div>
      )}
      {test.isSuccess && <p className="cm-hint">Working.</p>}
      {test.isError && <p className="import-error">{describeError(test.error)}</p>}
      {update.isError && <p className="import-error">{describeError(update.error)}</p>}
    </div>
  );
}

/** Settings → AI: local model (default, nothing leaves this computer) or a cloud API with your own key. */
export function AiSettings() {
  const { data: settings, isLoading } = useAiSettings();
  const update = useUpdateAi();
  const toast = useToast();
  const [view, setView] = useState(null); // what the person is looking at before they switch
  const [provider, setProvider] = useState(null);

  if (isLoading || !settings) return null;
  const shown = view ?? settings.mode;
  const chosen = provider ?? settings.provider;
  const ready = settings.keys[chosen].saved && settings.models[chosen];
  const usingChosen = settings.mode === 'api' && settings.provider === chosen;

  return (
    <section className="profile-section" aria-labelledby="ai-title">
      <div className="profile-section__head">
        <h2 id="ai-title">AI model</h2>
        <p>Powers highlights, categories and goals.</p>
      </div>
      <div className="profile-form ai-settings">
        <fieldset className="cm-kinds">
          <legend className="visually-hidden">Which model</legend>
          {[['local', 'On this computer'], ['api', 'Online']].map(([value, label]) => (
            <label key={value} className={`cm-kind${shown === value ? ' is-active' : ''}`}>
              <input type="radio" name="ai-mode" value={value} checked={shown === value} onChange={() => setView(value)} />
              {label}
            </label>
          ))}
        </fieldset>

        {shown === 'local' ? (
          <>
            <p className="cm-hint">
              Private. Nothing leaves your computer.
            </p>
            {settings.mode === 'api' && (
              <div className="profile-form__actions">
                <Button disabled={update.isPending} onClick={() => update.mutate({ mode: 'local' }, { onSuccess: () => (setView(null), toast('Using this computer')) })}>
                  Use this computer
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <fieldset className="cm-kinds">
              <legend className="visually-hidden">Provider</legend>
              {Object.entries(SHORT).map(([value, label]) => (
                <label key={value} className={`cm-kind${chosen === value ? ' is-active' : ''}`}>
                  <input type="radio" name="ai-provider" value={value} checked={chosen === value} onChange={() => setProvider(value)} />
                  {label}
                </label>
              ))}
            </fieldset>
            <ProviderKey key={chosen} provider={chosen} settings={settings} />
            <CloudOptions settings={settings} />
            <div className="profile-form__actions">
              {usingChosen ? (
                <p className="cm-hint">In use.</p>
              ) : (
                <Button
                  disabled={!ready || update.isPending}
                  onClick={() => update.mutate({ mode: 'api', provider: chosen }, { onSuccess: () => (setView(null), setProvider(null), toast(`Using ${PROVIDERS[chosen]}`)) })}
                >
                  Use {PROVIDERS[chosen].split(' (')[0]}
                </Button>
              )}
            </div>
          </>
        )}
        {update.isError && <p className="import-error">{describeError(update.error)}</p>}
      </div>
    </section>
  );
}
