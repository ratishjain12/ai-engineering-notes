---
name: import-post
description: Import a Notion export (zip or folder with markdown and images) into this repo as a new AI Engineering Notes article. Use when the user gives an export path and asks to import, add or publish a post.
---

# Import a Notion export as a post

Input: a path to a Notion export (zip, or an unzipped folder with one `.md` and its images). Optional: section (default `llms`), a release time (see Scheduling).

**No path given:** use the newest export in `~/Downloads`: the most recently modified `Export-*.zip`, or folder containing a `.md` and images (`ls -t ~/Downloads`). Say which file you picked and its modified time before using it; if nothing from the last day matches, ask instead of guessing.

## Steps

1. **Unzip and inspect.** Unzip to a temp dir, find the `.md`, list the images. Never leave the export inside the repo.
2. **Pick the slug and number.**
   - `slug` is the kebab-case title (`KV Cache` -> `kv-cache`).
   - Day number is the next after the highest `Day NN` in the `sidebar` of `astro.config.mjs`.
3. **Write `src/content/docs/<section>/<slug>.md`** with exactly this frontmatter:
   ```
   ---
   title: <Title>
   description: <one sentence, plain, no hype; ask the user if the export gives nothing to base it on>
   date: <UTC timestamp, e.g. 2026-10-05T06:30:00Z; today's date if no release time was given>
   ---
   ```
   `description` is mandatory: it is the email body and the social card text. `date` is the release instant (see Scheduling).
4. **Clean the Markdown from Notion.**
   - Remove the leading H1 (Starlight renders the title) and Notion property lines (`Created:`, `Tags:`, etc.).
   - Body headings start at `##`; never skip levels.
   - Decode URL-encoded paths; replace `notion.so` links with plain text unless they point to a public page.
   - Turn callouts into blockquotes, toggles into headings or plain paragraphs, and keep code fences with their language.
   - Do not rewrite the author's wording. Only fix structure, not prose.
5. **Move images** to `src/content/docs/<section>/<slug>-assets/`.
   - Rename to descriptive kebab-case (`query-key-matches.png`, not `Untitled_-_Visual_4.png`).
   - Reference as `./<slug>-assets/<name>.png`.
6. **Alt text on every image.** Describe what the image shows in one sentence, so it makes sense without the image. Formula images must start with `Formula:` (the site gives those a white card via `img[alt^='Formula']`).
7. **Sidebar:** add `{ label: 'Day NN · <Title>', slug: '<section>/<slug>' }` under the section in `astro.config.mjs`.
8. **README:** add the row to the Topics table, matching the existing rows.
9. **Verify:** run `pnpm build`; it must pass. Spot-check one built page under `dist/client/<section>/<slug>/index.html` for the images and sidebar label.
10. **Narration (default, ~$0.10; skip only if the user says no audio):** run `node --env-file=.env scripts/tts.mjs src/content/docs/<section>/<slug>.md`. It reads the built page (`dist/client/...`; for a future-dated post, which the build skips, start `astro dev --background` and pass `--html http://localhost:4321/<section>/<slug>/`), uploads the mp3 to R2 and writes `<slug>-assets/audio.json`, which makes the Listen player appear. Run with `--dry` first and read the code-block narrations: numbers with a minus sign, dropped multipliers and lost parentheses need fixing in the `.tts-cache/*.txt` file before the real run. If the dev server was started before the post existed, restart it. Re-run `pnpm build` afterwards. If the post text changes later, re-run it; the page disables highlighting (audio still plays) when the text no longer matches `audio.json`.
11. **Branch and PR.** Never commit to `main` directly.
    - `git checkout -b post/<slug>` from an up-to-date `main`.
    - Commit the post, its assets (including `audio.json`), the sidebar and README changes: `Add <Title> post`.
    - `git push -u origin post/<slug>`, then `gh pr create --base main`.
    - Title: `Add <Title> post`. Body follows `.github/pull_request_template.md`:
      - **Summary**: the post's one-line description.
      - **Changes**: the post file, N images, sidebar entry, README row.
      - **Verification**: `pnpm build` result.
      - **Publishing**: the checklist, with items ticked only if actually true. State the release: "on merge" or the scheduled time in IST and UTC.
    - Give the user the PR URL and stop. Do not merge.

## Scheduling

If the user gives a release time ("tomorrow 12pm", "Friday 9:30am", "in 2 hours"):

1. Interpret it in **IST (Asia/Kolkata)** unless they name another zone. Get the current time with `TZ=Asia/Kolkata date`, then convert to UTC (IST = UTC+5:30).
2. Write the UTC instant to `date:` as `YYYY-MM-DDTHH:MM:00Z`.
3. Tell the user the result before pushing: `12:00 IST Tue 6 Oct = 2026-10-06T06:30:00Z`. Warn and ask again if the time is in the past.
4. The scheduled workflow runs every 15 minutes, so the release lands **0-30 minutes after** the chosen time. Say so, e.g. "goes out between 12:00 and 12:30 IST".

With no release time, set `date` to the current UTC time: the post goes out on merge.

## Merging is publishing

- **No future date:** merging deploys the site, and the notify workflow **emails every active subscriber** once the page is live (once per slug). The user decides when to merge.
- **Future date:** the PR can be merged any time. Until the time arrives the page is not built and no email goes out. The first scheduled run after that time deploys the site, waits for the page to go live and sends the email.
- **`draft: true`** holds a post back indefinitely: same exclusion from the build and the sidebar, no email. Remove it in a normal commit to release it.

A post must stay out of the build until released, so the sidebar entry in `astro.config.mjs` is filtered by the same rules; keep adding entries in the usual `{ label, slug }` form.

Preview before merging with `pnpm dev` (the dev server shows future-dated posts).
