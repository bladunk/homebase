# HomeBase

HomeBase is a mobile-first household planner built with React, TypeScript, Vite, and Tailwind CSS. It starts with sample records and saves changes in the current browser's localStorage. The app has no backend or account.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

## Use HomeBase

- **Overview** lets you complete or edit today’s chores and catch up on overdue tasks. Compact widgets show upcoming dates, pantry alerts, shopping progress, dog care, and appliance maintenance.
- **Customize** lets you reorder or hide widgets, change their category colors and icons, and switch between Linen, Grove, and Dusk. Select **Save dashboard** to apply the changes. Preferences are saved separately on the current device. JSON backups still contain your household records.
- **Chores, Dog care, and Maintenance** let you add, edit, delete, and complete scheduled records. Repeating tasks advance by their interval from the later of the previous due date and the completion date. An interval of zero creates a one-time task. Completed one-time records stay in their section.
- **Pantry** flags stock at or below each item's threshold. The basket button adds the item to the first shopping list.
- **Shopping** supports multiple editable lists with checkable items.
- **Calendar** shows household events and the next due date of each active scheduled task. Select a day to see its agenda or add an event.
- **Backup & restore** exports the full dataset as JSON. Restoring a valid backup replaces the current data after confirmation.

## Deploy with GitHub Pages

1. In the repository, open **Settings → Pages** and select **GitHub Actions** as the source.
2. Merge the reviewed pull request into `main`. **HomeBase build and Pages** runs the tests, builds with Vite, and publishes the compiled `dist/` directory. To redeploy, open **Actions → HomeBase build and Pages → Run workflow** and select `main`.
3. When the deploy job succeeds, open the deployment URL shown in **Settings → Pages** or the workflow run. Use the same URL on your iPhone to retain access to its existing local records.

The live URL is https://bladunk.github.io/homebase/. Household records entered in the app stay in browser storage.

## Install on iPhone

1. Open the deployed HomeBase URL in Safari.
2. Tap **Share**, then **Add to Home Screen**. If your iOS version offers **Open as Web App**, leave it enabled.
3. Tap **Add**, then open HomeBase from its new icon.

HomeBase stores records locally for each browser or installed app. If you started in Safari and your records don't appear in the installed app, export a backup from Safari and import it from **Backup & restore** in the installed app. Save backups in Files before clearing website data, reinstalling the app, or changing devices.
