import { ArrowCounterClockwise, ArrowsClockwise, Bell, ChatCircleText, Plugs, Sparkle, SquaresFour, UserCircle, UsersThree } from '@phosphor-icons/react';
import { CUSTOMIZE_DASHBOARD_PATH } from '../../app/paths';
import { ProfilePage } from '../profile/ProfilePage';
import { YourCircle } from '../circle/YourCircle';
import { AppUpdates } from './AppUpdates';
import { DeviceNotifications } from '../profile/DeviceNotifications';
import { BankSms } from '../profile/BankSms';
import { DataSources } from '../profile/DataSources';
import { AiSettings } from '../profile/AiSettings';
import { ResetFinancialData } from '../profile/ResetFinancialData';

/*
 * The settings menu. Each entry is one page at /app/settings/<id>.
 *   page        the component; `needsProfile` passes the loaded profile to it
 *   to          a link elsewhere instead of a page (the dashboard edits in place)
 *   single      the page is one profile-section, so its own heading is hidden under the page title
 */
export const SETTINGS_GROUPS = [
  {
    label: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: UserCircle, blurb: 'Name, email, password', page: ProfilePage },
      { id: 'people', label: 'Your circle', icon: UsersThree, blurb: 'Contacts and family', page: YourCircle, single: true },
    ],
  },
  {
    label: 'Connections',
    items: [
      { id: 'bank-sms', label: 'Bank SMS', icon: ChatCircleText, blurb: 'Payments from bank texts', page: BankSms, single: true },
      { id: 'data-sources', label: 'Data sources', icon: Plugs, blurb: 'Weather, markets, news', page: DataSources, single: true },
      { id: 'ai', label: 'AI model', icon: Sparkle, blurb: 'Smart features', page: AiSettings, single: true },
    ],
  },
  {
    label: 'This app',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell, blurb: 'Reminders and alerts', page: DeviceNotifications, single: true },
      { id: 'app', label: 'App & updates', icon: ArrowsClockwise, blurb: 'Version and updates', page: AppUpdates, single: true },
      { id: 'dashboard', label: 'Dashboard layout', icon: SquaresFour, blurb: 'Choose widgets', to: CUSTOMIZE_DASHBOARD_PATH },
    ],
  },
  {
    label: 'Your data',
    items: [
      { id: 'reset', label: 'Reset financial data', icon: ArrowCounterClockwise, blurb: 'Start fresh', page: ResetFinancialData, single: true, danger: true },
    ],
  },
];

export const SETTINGS_ITEMS = SETTINGS_GROUPS.flatMap((g) => g.items);
export const settingsItem = (id) => SETTINGS_ITEMS.find((i) => i.id === id && i.page);

// Old Profile page anchors, mapped to their new pages.
export const LEGACY_HASHES = { '#data-sources': 'data-sources' };
