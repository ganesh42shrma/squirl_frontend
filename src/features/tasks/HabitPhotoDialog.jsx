import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { describeError } from '../../api/client';
import { useGuestMode } from '../../lib/useGuestMode';
import { AttachmentsPanel } from '../media/AttachmentsPanel';
import { useAttachments, useMediaStatus } from '../media/useMedia';
import { useCheckIn } from './useTasks';

/**
 * Photo proof for one day of a habit. Add a photo, then press Done: the day only counts once a photo is there.
 * With `viewOnly` (the day is already done) it just shows the photos.
 */
export function HabitPhotoDialog({ habit, date, label, viewOnly = false, onClose }) {
  const checkIn = useCheckIn();
  const { guestMode } = useGuestMode();
  const status = useMediaStatus();
  const photos = useAttachments('habit', habit._id, { day: date, enabled: status.data?.configured === true && !guestMode });
  const count = photos.data?.length || 0;
  const done = () => checkIn.mutate(
    { id: habit._id, date, ...(habit.targetQuantity ? { quantity: habit.targetQuantity } : {}) },
    { onSuccess: onClose },
  );
  const blocked = status.data?.configured === false ? 'Photos aren’t set up on this server yet, so this habit can’t be checked in.' : guestMode ? 'Turn off guest mode to add a photo.' : '';
  return (
    <Dialog
      title={`${habit.name} · ${label}`}
      onClose={onClose}
      footer={viewOnly
        ? <Button variant="quiet" onClick={onClose}>Close</Button>
        : <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button variant="accent" disabled={!count || checkIn.isPending} onClick={done}>{checkIn.isPending ? 'Saving…' : 'Done'}</Button>
        </>}
    >
      <div className="habit-photo">
        {!viewOnly && <p className="task-muted">{count ? `Photo added. Press Done to count ${label}.` : `Add a photo to count ${label}.`}</p>}
        {blocked && !viewOnly && <p className="import-error" role="alert">{blocked}</p>}
        <AttachmentsPanel ownerType="habit" ownerId={habit._id} day={date} title={null} readOnly={viewOnly} emptyHint={viewOnly ? 'No photo.' : 'No photo yet.'} />
        {checkIn.isError && <p className="import-error" role="alert">{describeError(checkIn.error)}</p>}
      </div>
    </Dialog>
  );
}
