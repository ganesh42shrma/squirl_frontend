import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { emitSystemEvents } from './systemEvents';

// Every Tasks response can carry `events` (XP, level-ups, awards...). Reading goes through here so
// they are announced exactly once, wherever the request came from.
async function call(path, options) {
  const response = await api(path, options);
  emitSystemEvents(response.events);
  return response;
}
const get = (path, query) => call(path, { query }).then((r) => r.data);

const KEY = 'tasks';

export const useTasksOverview = (options = {}) =>
  useQuery({ queryKey: [KEY, 'overview'], queryFn: () => get('/tasks/overview'), staleTime: 30_000, ...options });
export const useToday = () => useQuery({ queryKey: [KEY, 'today'], queryFn: () => get('/tasks/today') });
export const useTaskItems = (params) =>
  useQuery({ queryKey: [KEY, 'items', params], queryFn: () => call('/tasks/items', { query: params }), placeholderData: keepPreviousData });
export const useTaskLists = () => useQuery({ queryKey: [KEY, 'lists'], queryFn: () => get('/tasks/lists') });
export const useHabits = (archived = false) =>
  useQuery({ queryKey: [KEY, 'habits', { archived }], queryFn: () => get('/tasks/habits', { archived: archived || undefined }) });
export const useQuest = () => useQuery({ queryKey: [KEY, 'quest'], queryFn: () => get('/tasks/quests/today') });
export const useAchievements = () => useQuery({ queryKey: [KEY, 'achievements'], queryFn: () => get('/tasks/achievements') });
export const useXpSeries = (range = {}) => useQuery({ queryKey: [KEY, 'xp', range], queryFn: () => get('/tasks/xp', range) });
export const useTasksSettings = () => useQuery({ queryKey: [KEY, 'settings'], queryFn: () => get('/tasks/settings') });

// Almost everything in Tasks touches XP, streaks or the quest, so any change refreshes all of it.
function useTasksMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars) => mutationFn(vars).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}
const send = (method, path, body) => call(path, { method, body });

export const useCreateTask = () => useTasksMutation((body) => send('POST', '/tasks/items', body));
export const useUpdateTask = () => useTasksMutation(({ id, ...body }) => send('PATCH', `/tasks/items/${id}`, body));
export const useDeleteTask = () => useTasksMutation((id) => send('DELETE', `/tasks/items/${id}`));
export const useCompleteTask = () => useTasksMutation((id) => send('POST', `/tasks/items/${id}/complete`));
export const useReopenTask = () => useTasksMutation((id) => send('POST', `/tasks/items/${id}/reopen`));
export const useAddChecklistItem = () => useTasksMutation(({ id, text }) => send('POST', `/tasks/items/${id}/checklist`, { text }));
export const useUpdateChecklistItem = () => useTasksMutation(({ id, ...body }) => send('PATCH', `/tasks/checklist/${id}`, body));
export const useRemoveChecklistItem = () => useTasksMutation((id) => send('DELETE', `/tasks/checklist/${id}`));

export const useCreateList = () => useTasksMutation((body) => send('POST', '/tasks/lists', body));
export const useUpdateList = () => useTasksMutation(({ id, ...body }) => send('PATCH', `/tasks/lists/${id}`, body));
export const useDeleteList = () => useTasksMutation((id) => send('DELETE', `/tasks/lists/${id}`));

export const useCreateHabit = () => useTasksMutation((body) => send('POST', '/tasks/habits', body));
export const useUpdateHabit = () => useTasksMutation(({ id, ...body }) => send('PATCH', `/tasks/habits/${id}`, body));
export const useDeleteHabit = () => useTasksMutation((id) => send('DELETE', `/tasks/habits/${id}`));
export const useArchiveHabit = () => useTasksMutation(({ id, archived = true }) => send('POST', `/tasks/habits/${id}/archive`, { archived }));
export const useCheckIn = () => useTasksMutation(({ id, ...body }) => send('POST', `/tasks/habits/${id}/checkins`, body));
export const useUndoCheckIn = () => useTasksMutation(({ id, date }) => send('DELETE', `/tasks/habits/${id}/checkins/${date}`));
export const useBindEcho = () => useTasksMutation((id) => send('POST', `/tasks/habits/${id}/bind`));

export const useToggleQuestItem = () => useTasksMutation((key) => send('POST', `/tasks/quests/today/items/${encodeURIComponent(key)}/toggle`));
export const useSetQuestItems = () => useTasksMutation((items) => send('PUT', '/tasks/quests/today', { items }));
export const useConfigureQuest = () => useTasksMutation((body) => send('PUT', '/tasks/quests/config', body));
export const useCompletePenalty = () => useTasksMutation(() => send('POST', '/tasks/quests/penalty/complete'));
export const useSaveTasksSettings = () => useTasksMutation((body) => send('PATCH', '/tasks/settings', body));
export const useEquipTitle = () => useTasksMutation((title) => send('PATCH', '/tasks/profile', { title }));
export const useClaimTrial = () => useTasksMutation(() => send('POST', '/tasks/trial/claim'));

// Labels shared by the forms and cards.
export const DIFFICULTIES = [
  { id: 'trivial', label: 'Trivial', badge: 'E', xp: 5, hint: 'A quick reply or tidy-up' },
  { id: 'easy', label: 'Easy', badge: 'D', xp: 10, hint: 'A 15-minute chore' },
  { id: 'normal', label: 'Normal', badge: 'C', xp: 20, hint: 'About an hour of focus' },
  { id: 'hard', label: 'Hard', badge: 'B', xp: 40, hint: 'Half a day' },
  { id: 'epic', label: 'Epic', badge: 'A', xp: 80, hint: 'A full day' },
  { id: 'boss', label: 'Boss', badge: 'S', xp: 150, hint: 'A project: needs 3+ subtasks' },
];
export const STATS = [
  { id: 'str', label: 'Strength', hint: 'Fitness' },
  { id: 'vit', label: 'Vitality', hint: 'Health, sleep, food' },
  { id: 'agi', label: 'Agility', hint: 'Chores and quick wins' },
  { id: 'int', label: 'Intellect', hint: 'Learning and deep work' },
  { id: 'per', label: 'Perception', hint: 'Money and planning' },
  { id: 'cha', label: 'Charisma', hint: 'People and social' },
];
export const CADENCES = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Chosen weekdays' },
  { id: 'times_per_week', label: 'Times per week' },
  { id: 'every_n_days', label: 'Every N days' },
  { id: 'times_per_month', label: 'Times per month' },
];
export const RANK_NAMES = { E: 'E-Rank', D: 'D-Rank', C: 'C-Rank', B: 'B-Rank', A: 'A-Rank', S: 'S-Rank', N: 'National', X: 'Apex' };
