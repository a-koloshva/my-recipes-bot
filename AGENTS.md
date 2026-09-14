# AGENTS.md — my_recipes_bot

## Quickstart

- `npm run node` — run the bot (starts `node bot.js`)
- Set `BOT_TOKEN` in `.env`; bot exits if missing

## Data

- Recipes stored in `data/recipes.json`
- `CATEGORIES` in `data.js`: `breakfast`, `lunch`, `dinner`
- DB is file-based JSON; no migrations, no schema

## Commands (via Telegram)

- `/start` — show main menu
- `/help` — show usage help
- Callback buttons: add recipe (→ name → category), list recipes, category view, delete recipe
- Text input: enters recipe name when `addStep === 'wait_name'`

## Development

- No test framework configured; no `npm test` script
- No lint/typecheck configured
- Edits to `data.js` persist to `data/recipes.json` on next bot run
- `bot.launch()` starts polling; `SIGINT`/`SIGTERM` handled gracefully

## Gotchas

- `dotenv/config` must be imported **before** accessing `process.env` (line 1 of `bot.js`)
- Bot token must be set; otherwise process exits with code 1
- Data directory `data/` is auto-created if missing, but `recipes.json` starts empty