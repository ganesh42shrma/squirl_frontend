# Squirl — Frontend

The web app for Squirl, a personal money log. Built with React 19 and Vite, in plain JavaScript.

## Running it

The backend (`../backend`) must be running on port 4000.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

In development, Vite proxies `/api` to `http://localhost:4000`, so there is no CORS setup.

| Env var | Default | Purpose |
|---|---|---|
| `VITE_API_PROXY` | `http://localhost:4000` | where the dev server sends `/api` |
| `VITE_API_URL` | *(same origin)* | backend URL for a production build hosted separately |

## Pages

Profile → **Bank SMS** configures one owned account per bank, exact SMS sender IDs, device-token
creation/revocation, and a paginated review queue. SBI presets are `VK-SBIUPI-S`, `AD-SBIUPI-S`;
Kotak presets are `JM-KOTAKB-S`, `JD-KOTAKB-S`, `JX-KOTAKB-S`. Actual account suffixes are entered by
the person and are never bundled into the application. Previously saved sender lists take priority.

This needs the backend SMS endpoints and migration v20. Open the private HTTPS address to create
a pairing code. The one-time code contains the current HTTPS origin, the scoped device token and
bank mappings; it is held only in component state and copied only on request, never browser storage
or the query cache. Revoke/re-pair if it is lost. Guest mode unmounts the entire private setup/review
interface. Review confirmations refresh ledger, summary, insights, commitments, goals and profile
queries. This screen does **not** read SMS: the Android helper still needs to be built and installed.

After updating this frontend on Linux, run `VITE_API_URL= npm run build` in this directory and reload
the installed PWA. No new dependencies are required. Run `npm run test:sms-ui` for the synthetic
sender validation, query/mutation and initial-render checks.

| Route | What it's for |
|---|---|
| `/` | Landing page |
| `/login`, `/signup` | Sign in / create an account (signed-in visitors go straight to the app) |
| `/forgot-password`, `/reset-password?token=…` | Ask for a reset link; choose a new password from it |
| `/app/profile` | Name and email, change password (signs out other devices), delete the account |
| `/app` | **Dashboard** (home): balance across accounts, each account with its trend, balance over time (3M–All), the latest month against the one before, where it went, latest rows, and anything that needs attention (gaps between statements, stale accounts, unsorted rows) |
| `/app/ledger` | **Ledger**: the month as a spreadsheet. Add rows with the keyboard, click any cell to edit it, select rows to sort or tag them together |
| `/app/ledger?view=unsorted` | Every row still waiting for a category, across all months |
| `/app/ledger?importId=…` | Rows from one statement import |
| `/app/highlights` | **Month**: where the month's money went, its figures, the last six months, spending by tag. **History** (`?view=history`): any longer period (last 12 months, all time, a year): highlights, money in and out per month, balance over time, top categories, largest rows, and an optional summary written by a local model |
| `/app/imports` | Upload an SBI or Kotak PDF (the bank is detected), see what each import added, undo one |
| `/app/sort-out` | Unsorted rows, plus managing categories and tags |

Ledger shortcuts:
- **Enter** in the add row saves it, and focus returns to the description for the next row.
- **Enter** saves a cell edit and **Escape** cancels it.
- In the amount cell, type `+500` for money in or `-500` for money out.

## Structure

```
src/
├── main.jsx, App.jsx          # providers (React Query, router, toasts) and routes
├── api/client.js              # fetch wrapper: unwraps { success, data } and throws ApiError
├── lib/                       # formatting (₹, dates, months), money types, small hooks
├── styles/tokens.css          # colour, type and spacing tokens, light and dark
├── components/
│   ├── ui/                    # Button, Toast, MonthSwitcher, shared field styles
│   ├── fx/                    # BlurText, CountUp (motion-based, respect reduced motion)
│   ├── charts/                # BalanceChart (step area + table view), Sparkline
│   ├── illustrations/         # the hand-drawn squirrel and spot drawings
│   └── layout/                # app shell, logo, theme toggle
└── features/                  # one folder per feature, like the backend's plugins
    ├── ledger/                # useTransactions, LedgerPage, AddRow, LedgerRow, BulkBar
    ├── categories/            # useCategories, CategorySelect
    ├── tags/                  # useTags, TagInput, TagPill
    ├── dashboard/             # DashboardPage (the home page)
    ├── insights/              # Highlights: month view, HistoryView, useInsights
    ├── imports/
    ├── sortout/
    └── landing/
```

Everything under `/app` is behind `RequireAuth`: a signed-out visitor is sent to `/login?next=…` and back after
signing in. The session is an httpOnly cookie, so the frontend never sees a token; `api()` sends the
`X-Requested-With: squirl` header the backend requires on writes. Whenever the signed-in account changes
(sign in, sign out, reset, a 401 from any request) the whole query cache is dropped, so one account's data is
never shown to the next.

Data lives in React Query. Each feature's `use*.js` file holds its queries and mutations. Mutations invalidate whatever they affect: changing a transaction refreshes the lists, the totals and the tag counts.

## Design notes

- **Palette**: warm paper, slate ink, and one accent per money type: clay for spent, olive for earned, sky for invested, kraft for transfers, heather for lending.
- **Type**: Source Serif 4 for headlines and totals. Hanken Grotesk for the interface, with tabular figures so amounts line up.
- **Chart colours** (`--viz-*`) are stronger shades of the same hues, kept separate from the UI accents. Both the light and dark sets passed a colour-blindness separation check across every pair. Charts always carry text labels as well, and the six-month chart has a table view.
- **Icons**: [Phosphor](https://phosphoricons.com). Interface icons use the regular weight. Category icons use duotone (an ink outline over a soft fill, like the illustrations), tinted by money type. The category-to-icon map is in `src/lib/categoryIcons.js`. A category with no entry uses its parent's icon, then its emoji, then a plain tag.
- **Motion**: the hero drawing sketches itself in once, and the monthly total counts up when the month changes. Everything else moves only in response to what you do. Reduced-motion settings are respected throughout.

## Installed Android app (PWA)

`npm run build` also generates the service worker. Run `npm run test:pwa` after building.
The worker caches public interface files and provides a reconnect page; financial API responses
are never cached and offline financial editing is not supported. Profile → This device controls
notifications. The private desktop serves the build and `/api` from one HTTPS origin through
Tailscale; see [the setup guide](../squirl_backend/deployment/MOBILE.md).

New SMS ledger payments can send a generic **What was this for?** push with an **Add note** text
reply on Chrome Android. Tapping the notification opens the same prompt in the ledger as a fallback.
Replies append to payment notes, preserving bank narration and existing annotations. This requires
backend migration v21 and an enabled push subscription; **Profile → This device → New SMS payments**
controls it per device. The push hides names and amounts. Failed inline replies remain in the device
notification for explicit retry; dismissing it loses the unsent draft. See the
[payment push contract and deployment steps](../squirl_backend/deployment/SMS.md#new-payment-push-and-purpose-notes).
