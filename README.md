# HomeBase V3

HomeBase is a mobile-first household planner built with React, TypeScript, Vite, and Tailwind CSS. It runs in the browser and stores data on the current device. A fresh install starts with sample records.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm test
npm run build
npm run dev
```

## Use HomeBase

- **Home → Customize** manages dashboard widgets, widths, order, and sections. Add a widget from the library or remove one from the layout. Style controls set each widget's color, icon, and summary, list, or metric view. Themes include Dusk, Linen, and Grove, with controls for density, accent, and texture. **Reset layout** restores the default widgets and sections when you save. Your theme and household records are kept.
- **Chores** supports one-time, daily, weekly, monthly, weekday, fixed-interval, and completion-based schedules. Use a task's **Activity** button to snooze, skip, see history, or undo its latest action. Snoozing changes the visible due date without changing the recurrence anchor. Fixed schedules advance to the next date after the current occurrence or, if overdue, after today. Monthly schedules on the 29th–31st use the last valid day in shorter months. Completion-based schedules count from the day you complete the task. Existing interval records retain their previous behavior.
- **More → Routines** groups existing chores and shows progress for the current local day. Checking an active chore also completes it in its schedule. A closed one-time chore can be checked off as a routine step without reopening its schedule.
- **Pantry** supports quantity controls, favorites, activity categories, expiration dates, and low-stock thresholds. **Shopping** suggests low-stock products that are missing from open lists. Choose a list and add the suggestions you want.
- **Calendar** shows events and the next due date of each active task, including snoozed dates. **More** also contains dog care, appliance maintenance, category management, and backup and restore. You can assign a custom category when editing a household record or routine, then add its **Category activity** widget to the dashboard.
- **Backup & restore** exports household data and dashboard preferences in a V3 JSON file. A validated V3 restore replaces both after confirmation. V1 household backups still import, and keep the current dashboard layout. Any category widgets tied to categories missing from the imported records are left unassigned.

## Storage and migration

Before V3, `homebase-v1` held chores, pantry items, and other household records. Recurrence used one due date, an interval in days, and a last completion date. `homebase-dashboard-v1` held the theme, widget order and visibility, colors, and icons.

V3 reads those keys in place. The first successful save writes a versioned `homebase-v3` snapshot containing both household records and dashboard preferences. The legacy keys remain available on the device and are not overwritten. If saved records cannot be loaded, HomeBase displays an error and blocks edits until a valid backup is restored. Recurring tasks still store one next occurrence per task, with a separate log of actions and their undo status.

## Deploy with GitHub Pages

1. Confirm **Settings → Pages → Source** is set to **GitHub Actions**.
2. Merge the reviewed pull request into `main`. **HomeBase build and Pages** runs the tests, builds with Vite, and publishes `dist/`. To redeploy manually, run that workflow on `main`.
3. After the deploy job succeeds, reopen https://bladunk.github.io/homebase/ using the same Safari or Home Screen app to retain access to local records.

## Install on iPhone

1. Open the deployed HomeBase URL in Safari.
2. Tap **Share → Add to Home Screen**. If iOS offers **Open as Web App**, leave it enabled.
3. Tap **Add** and open HomeBase from the new icon.

If your records are in Safari and do not appear in the installed app, export a backup from Safari and import it in the installed app. Keep a backup in Files before clearing website data or changing devices.
