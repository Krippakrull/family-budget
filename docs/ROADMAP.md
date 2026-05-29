# Roadmap

---

## PWA Enhancements

The app is built mobile-first but has zero PWA infrastructure today. `static/` contains only `robots.txt`.

**Installability**
Add a `manifest.webmanifest` (name, icons, `display: standalone`, `start_url`, `theme_color`) and register it in the root layout `<svelte:head>`. Use `vite-plugin-pwa` to generate the service worker and asset manifest automatically during build.

**Offline support**
Cache the app shell (HTML, JS, CSS, fonts) with a service worker so the app loads when offline. Budget data for recently visited months can be stale-while-revalidate cached so users can at least read their last-loaded data without a connection.

**Push notifications**
Replace the current email-only reminder system with Web Push. Store a `pushSubscription` per user in the DB and send via the existing cron endpoint. Members could opt in per-device from the Settings page.

**Home-screen experience**
Add `<meta name="theme-color">` that switches with the active accent color and dark/light theme so the browser chrome matches the app. Add `apple-touch-icon` and appropriate splash screens for iOS.

**Background sync**
Queue `addItem` / `updateItem` / `deleteItem` mutations in IndexedDB when offline and replay them via Background Sync once connectivity is restored, so users can enter items on the go without losing data.

---

## Theme: Auto-Apply + Persist on User

Currently the sidebar theme-switcher calls `applyTheme()` (instant DOM mutation) then fires `POST /api/theme` in the background — so the live preview already works. The settings page has a separate redundant `updateTheme` form action that only persists without previewing.

**Unify the two paths**
Remove the `updateTheme` form action from the settings page entirely and replace it with the same live-preview + background-persist pattern the sidebar switcher uses. Both surfaces should call `applyTheme()` immediately and `POST /api/theme` to persist — no page reload required.

**System-preference detection**
On first visit (no saved preference), read `prefers-color-scheme` and default to dark/light accordingly, rather than always defaulting to `'light'`. Store the detected value via `POST /api/theme` so subsequent loads stay consistent.

**Accent color in the PWA theme-color meta**
When the user changes their accent, update `<meta name="theme-color">` dynamically so the browser chrome matches (relevant once PWA support is added above).

---

## Budget View: Current User's Card Always on Top

`loadBudgetData()` has no `ORDER BY` — member cards render in DB insertion order. The current user's card should always be the first one rendered.

**Server-side fix**
In `loadBudgetData()` (or in the `load` function), sort the returned `members` array so that the entry matching `currentUserId` comes first, with remaining members in consistent alphabetical order by name.

**Visual distinction**
Give the current user's card a subtle border or header background that distinguishes it from other members' cards at a glance — especially useful on larger families where multiple cards are visible simultaneously.

**Sticky card on mobile**
On narrow viewports where cards stack vertically, consider making the current user's card sticky at the top of the scroll area so the user can always reach their own add-income/add-expense form without scrolling past other members' cards.

---

## Other Ideas

**Drag-to-reorder budget items**
The `sortOrder` column already exists on `budgetItems` but is always inserted as `0`. Wire up a drag handle on each `BudgetItemRow` using the HTML5 Drag and Drop API (or a lightweight library) and persist the new order via a new `reorderItem` server action.

**Remove member from family**
There is currently no way to remove a user from a family. Add a "Remove from family" action on the `/family` page (owner-only). Removing a member should set their `familyId` to null but preserve their historical `memberBudgets` rows for past months so the budget history stays intact.

**Password reset**
There is no forgot-password flow. Add a `POST /forgot-password` action that generates a time-limited token (similar to the invite token), stores it in a new `passwordResetTokens` table, and sends an email via the existing Resend integration. The reset link lands on `/reset-password/[token]`.

**Budget item notes**
Add an optional free-text `notes` column to `budgetItems`. Render it as a small expandable section below the item name in `BudgetItemRow`. Useful for recording what a particular expense was for (e.g. "Grocery run + birthday gift").

**Custom statistics date range**
The `custom_range` message key already exists but the feature is not implemented. Add a date-range picker to `/statistics` that allows any start/end month, not just the 3/6/12 presets.

**Export to CSV**
Add a download button to the `/statistics` page and to each `/budget/[year]/[month]/summary` that exports the visible data as a CSV. Uses only built-in browser APIs — no additional dependencies needed.

**Currency setting per family**
Currency is hardcoded to SEK throughout. Add a `currency` column to the `families` table (default `'SEK'`) and a selector on the `/family` settings page. Pass the currency through to `loadBudgetData()` and the display components so that international families can use the app as-is.

**Avatar / profile picture**
The `ui/avatar/` component directory exists but is unused. Allow users to upload a small profile picture (stored as a base64 data URL or a path in `static/avatars/`) and display it in member card headers and the family members list.

**Savings goals**
Add a `savingsGoals` table (family-scoped: name, target amount, target date). Display progress on the statistics page as a simple progress bar: total income minus total expenses across months, tracked against the goal amount.
