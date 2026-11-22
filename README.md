# HomeBase

HomeBase is a mobile-first household planner built with React, TypeScript, Vite, and Tailwind CSS. It starts with sample records and saves changes in the current browser's localStorage. The app has no backend or account.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

## Use HomeBase

- **Overview** shows due tasks, upcoming dates, low-stock items, and unchecked shopping items.
- **Chores, Dog care, and Maintenance** let you add, edit, delete, and complete scheduled records. Repeating tasks advance by their interval from the later of the previous due date and the completion date. An interval of zero creates a one-time task. Completed one-time records stay in their section.
- **Pantry** flags stock at or below each item's threshold. The basket button adds the item to the first shopping list.
- **Shopping** supports multiple editable lists with checkable items.
- **Calendar** shows household events and the next due date of each active scheduled task. Select a day to see its agenda or add an event.
- **Backup & restore** exports the full dataset as JSON. Restoring a valid backup replaces the current data after confirmation.

## Deploy with GitHub Pages

1. In the repository, open **Settings → Pages** and select **GitHub Actions** as the source.
2. Merge the reviewed pull request into `main`. The **HomeBase build and Pages** workflow builds and publishes the site. You can also run it manually from `main`.
3. Open the deployment URL from the workflow or Pages settings.

The current repository is private. GitHub Pages for a private repository requires an eligible GitHub plan. For free GitHub Pages hosting, use a public repository if you choose to make the sample project public. Household records entered in the app stay in browser storage and aren't committed to GitHub.

## Install on iPhone

1. Open the deployed HomeBase URL in Safari.
2. Tap **Share**, then **Add to Home Screen**. If your iOS version offers **Open as Web App**, leave it enabled.
3. Tap **Add**, then open HomeBase from its new icon.

HomeBase stores records locally for each browser or installed app. If you started in Safari and your records don't appear in the installed app, export a backup from Safari and import it from **Backup & restore** in the installed app. Save backups in Files before clearing website data, reinstalling the app, or changing devices.
