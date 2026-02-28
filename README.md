# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv create --template minimal --types ts --no-install .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Reminder Cron Job

Use the reminder endpoint to notify members with unapproved budgets for the upcoming month.

```sh
# Production cron example (runs at 09:00 daily)
0 9 * * * curl -s "https://yourapp.com/api/cron/reminders?key=YOUR_CRON_SECRET"
```

Manual local test:

```sh
curl "http://localhost:5173/api/cron/reminders?key=your_cron_secret"
```
