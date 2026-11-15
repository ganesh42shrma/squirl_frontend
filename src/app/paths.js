// Route helpers with no dependencies, so any feature can link to another without importing pages.
// Every internal link to a module page goes through these, so moving a page is a one-line change.
export const APP = '/app';
export const financePath = (tab = 'ledger', suffix = '') => `${APP}/finance/${tab}${suffix}`;
export const tasksPath = (tab = 'today', suffix = '') => `${APP}/tasks/${tab}${suffix}`;
export const scoopPath = (tab = 'live', suffix = '') => `${APP}/scoop/${tab}${suffix}`;
export const goalPath = (id) => financePath('goals', `/${id}`);
export const PROFILE_PATH = `${APP}/profile`;
export const DASHBOARD_PATH = APP;
// The dashboard now edits in place; the old settings page URL redirects here.
export const CUSTOMIZE_DASHBOARD_PATH = `${APP}?customize=1`;
