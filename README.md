# HomeBase V4

HomeBase is a mobile-first household planner built with React, TypeScript, Vite, and Tailwind CSS. It runs in the browser and stores data on the current device. New households start with optional guided setup. Existing installations keep their household records and preferences.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

## Use HomeBase

- **Guided setup** asks about home type, rooms, occupants, children, pets, equipment, floors, and the way you want to clean. Preview the suggested chores and adjust their timing and estimates before importing. Existing chores are matched by template identity and common names. **Chores → Undo last import** removes untouched imports, preserving anything edited, used, or attached to a routine.
- **Chore library** contains 113 searchable templates across ten categories. Templates separate source-backed timing or methods from HomeBase defaults. Estimates represent hands-on time and can be edited. Product-specific guidance applies to the stated model or equipment. After-use and as-needed tasks can be logged from **Today** without generating calendar occurrences.
- **Today** prioritizes overdue work, offers one-tap completion and task activity, and shows a seven-day workload preview. Weekly preferences control the daily budget, preferred scheduling days, rest days, and breaks. Only flexible chores can move within the suggested plan. Medication, other fixed schedules, time-sensitive work, and explicit snoozes keep their dates. Over-budget days are labeled and the plan keeps saved due dates intact.
- **More → Progress** is optional. Choose a recommended personal pace, see progress against it, and track scores and completion counts over eight weeks.
- **Home → Customize** manages dashboard widgets, widths, order, and sections. Add a widget from the library or remove one from the layout. Style controls set each widget's color, icon, and summary, list, or metric view. Themes include Dusk, Linen, and Grove, with controls for density, accent, and texture. **Reset layout** restores the default widgets and sections when you save. Your theme and household records are kept.
- **Chores** supports one-time, daily, weekly, monthly, weekday, fixed-interval, and completion-based schedules. Use a task's **Activity** button to snooze, skip, see history, or undo its latest action. Snoozing changes the visible due date without changing the recurrence anchor. Fixed schedules advance to the next date after the current occurrence or, if overdue, after today. Monthly schedules on the 29th–31st use the last valid day in shorter months. Completion-based schedules count from the day you complete the task. Existing interval records retain their previous behavior.
- **More → Routines** groups existing chores and shows progress for the current local day. Checking an active chore also completes it in its schedule. A closed one-time chore can be checked off as a routine step without reopening its schedule.
- **Pantry** supports quantity controls, favorites, activity categories, expiration dates, and low-stock thresholds. **Shopping** suggests low-stock products that are missing from open lists. Choose a list and add the suggestions you want.
- **Calendar** shows events and the next due date of each active task, including snoozed dates. **More** also contains dog care, appliance maintenance, category management, and backup and restore. You can assign a custom category when editing a household record or routine, then add its **Category activity** widget to the dashboard.
- **Backup & restore** exports household data, dashboard preferences, and V4 planning settings as JSON. V1 and V3 backups still import. V1 imports keep the current dashboard layout and clear any category assignment that cannot be matched. Restores require confirmation.

## V4 changelog and implementation stages

1. **Library and onboarding.** Added a typed template catalog with source metadata, a four-step questionnaire and editable preview, and an append-only import with duplicate checks and undo.
2. **Planning.** Reused V3 recurrence and task history for Today and the weekly proposal. The planner reserves fixed occurrences first, prioritizes overdue flexible work, and prefers dates with available time. It observes configured rests and finishes each flexible occurrence's placement window before the next occurrence. Repeating forecasts are previews, with one saved next occurrence per task.
3. **Personal progress and polish.** Added opt-in Home Score, XP, levels, badges, a forgiving weekly streak, challenges against the chosen pace, and historical charts. Added search and shortcut actions in the existing themes and mobile shell.

## Source notes

The catalog links to the supporting page for sourced timing, methods, and background. The source for general home care may differ from the source for an appliance. Template durations, priority, and unsourced cadences are configurable HomeBase defaults.

- [CDC home cleaning](https://www.cdc.gov/hygiene/about/when-and-how-to-clean-and-disinfect-your-home.html) and [CDC infant feeding items](https://www.cdc.gov/hygiene/about/clean-sanitize-store-infant-feeding-items.html)
- [American Cleaning Institute home cleaning routine](https://www.cleaninginstitute.org/cleaning-tips/clean-home/home-cleaning-routine)
- [NSF guidance for frequently contaminated household items](https://www.nsf.org/consumer-resources/articles/clean-germiest-home-items)
- [Whirlpool maintenance](https://www.whirlpool.com/blog/kitchen/home-maintenance-checklist.html), [Samsung dryer care](https://www.samsung.com/us/support/answer/ANS10001019/), and [Keurig K-Elite care](https://www.keurig.com/hub/support/how-to-use-keurig-k-elite)

## Progress formulas

- **Home Score and weekly challenge.** Choose a 3-, 5-, or 7-day weekly pace. The target is capped at the number of days remaining after rest days and saved breaks are excluded. Each eligible day with at least one completed chore counts once. Score is `round(100 × completed eligible days ÷ target)`, capped at 100. A fully paused week has no score.
- **XP and level.** Each unique chore completion day earns 10 XP. Level is `1 + floor(total XP / 100)`. Undo removes the completion from progress. When older records lack history, their most recent completion counts.
- **Streak and badges.** The streak counts weeks that reach the target. An unfinished current week, fully paused weeks, and weeks interrupted by a saved break can carry the streak forward. Badges recognize first completion, 25 credits, hitting a weekly goal, and a three-week streak.
- **History.** Charts are derived from retained chore history with the selected pace and current rest preferences. A signed-in account or household comparison dataset is unnecessary.

## Storage and recovery

The original `homebase-v1` key stores household records, and `homebase-dashboard-v1` stores the earlier widget and theme settings. V3 saves records and dashboard settings in `homebase-v3`. V4 reads those formats and writes to a separate `homebase-v4` key on the first save. The old keys remain intact.

If V4 data cannot be read, HomeBase blocks edits and lets you review a readable older copy or import a valid JSON backup. Only a confirmed restore writes over the damaged active copy. Recurrence, task history, and timestamps use dates in the device's local calendar.

## Deploy with GitHub Pages

1. Confirm **Settings → Pages → Source** is set to **GitHub Actions**.
2. Merge the reviewed pull request into `main`. **HomeBase build and Pages** runs the tests, builds with Vite, and publishes `dist/`. To redeploy manually, run that workflow on `main`.
3. After the deploy job succeeds, reopen https://bladunk.github.io/homebase/ using the same Safari or Home Screen app to retain access to local records.

## Install on iPhone

1. Open the deployed HomeBase URL in Safari.
2. Tap **Share → Add to Home Screen**. If iOS offers **Open as Web App**, leave it enabled.
3. Tap **Add** and open HomeBase from the new icon.

If your records are in Safari and do not appear in the installed app, export a backup from Safari and import it in the installed app. Keep a backup in Files before clearing website data or changing devices.
