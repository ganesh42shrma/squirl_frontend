import { useRef, useState } from 'react';
import { UploadSimple } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { describeImport } from './circleModel';
import { useImportContacts } from './useCircle';

// The same limit as the server (20 MB), checked here first so a huge file never starts uploading.
const MAX_BYTES = 20 * 1024 * 1024;

/** Pick a .vcf phone-book export; shows what was added, merged and skipped. The file is read once and never kept. */
export function ImportContacts() {
  const input = useRef(null);
  const importing = useImportContacts();
  const [tooBig, setTooBig] = useState(false);
  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    importing.reset();
    setTooBig(file.size > MAX_BYTES);
    if (file.size <= MAX_BYTES) importing.mutate(file);
  };
  return (
    <div className="circle-import">
      <div className="circle-import__row">
        <Button variant="quiet" size="small" disabled={importing.isPending} onClick={() => input.current?.click()}>
          <UploadSimple size={16} aria-hidden="true" /> {importing.isPending ? 'Importing…' : 'Import contacts'}
        </Button>
        <input ref={input} type="file" accept=".vcf,.vcard,text/vcard,text/x-vcard,text/directory,text/plain" hidden onChange={pick} aria-label="Choose a contacts file" />
        <span className="member-hint">Import a .vcf file from your phone. It stays on this computer.</span>
      </div>
      {importing.isSuccess && (
        <div className="circle-import__result" role="status">
          {describeImport(importing.data).map((line) => <p key={line}>{line}</p>)}
          <p className="member-hint">Imports don’t mark family or change categories.</p>
        </div>
      )}
      {(importing.isError || tooBig) && <p className="import-error" role="alert">{tooBig ? 'That file is too big. The limit is 20 MB.' : describeError(importing.error)}</p>}
      <details className="circle-import__help">
        <summary>How do I get this file?</summary>
        <p><strong>Android:</strong> Contacts → Menu → Settings → Export → Export to .vcf file.</p>
        <p><strong>iPhone:</strong> on icloud.com open Contacts, select all (⌘A), then the gear → Export vCard.</p>
        <p>Only names and Indian mobile numbers are kept. Emails, addresses, photos and notes are dropped.</p>
      </details>
    </div>
  );
}
