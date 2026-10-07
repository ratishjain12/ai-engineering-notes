## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Workflow

- `main` is protected by a ruleset: changes go through a PR, merged by **squash** only, with the `Workers Builds: learn-ai-daily` check passing. Never push to `main` and never merge with `--admin`.
- Branches: `post/<slug>`, `feat/<what>`, `fix/<what>`, `chore/<what>`. PR title is an imperative sentence under 70 characters, no trailing period (`Add <Title> post`). The body follows `.github/pull_request_template.md`. Branches are deleted on merge.
- Run `pnpm build` before opening a PR; it must pass.
- Open the PR and stop. The user merges.

## Publishing posts

- New articles come from a Notion export via the `/import-post` skill (`.claude/skills/import-post/SKILL.md`), which defaults to the newest export in `~/Downloads`.
- Merging deploys the site, and the `Notify subscribers` workflow emails every active subscriber once per slug. Only files *added* in a push trigger it; edits to existing posts never email.
- `date` in the frontmatter is the release instant, a UTC timestamp (`2026-10-05T06:30:00Z`). Future-dated posts and `draft: true` posts are left out of the build and the sidebar. A workflow, dispatched every 15 minutes by the `learn-ai-scheduler` Cloudflare Worker (`scheduler/`; GitHub's own cron is throttled and only a fallback), deploys and emails them once due, so a post goes out 0-30 minutes after its time.
- Release times the user gives are IST (UTC+5:30) unless they say otherwise. Echo the converted UTC time back and ask if it is ambiguous or in the past.
- Sidebar entries in `astro.config.mjs` stay in the plain `{ label, slug }` form; the config filters them with the same draft and date rules.
