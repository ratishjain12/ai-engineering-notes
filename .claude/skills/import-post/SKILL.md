---
name: import-post
description: Import a Notion export (zip or folder with markdown and images) into this repo as a new AI Engineering Notes article. Use when the user gives an export path and asks to import, add or publish a post.
---

# Import a Notion export as a post

Input: a path to a Notion export (zip, or an unzipped folder with one `.md` and its images). Optional: section (default `llms`), whether to publish.

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
   date: <today, YYYY-MM-DD>
   ---
   ```
   `description` is mandatory: it is the email body and the social card text.
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
10. **Branch and PR.** Never commit to `main` directly.
    - `git checkout -b post/<slug>` from an up-to-date `main`.
    - Commit the post, its assets, the sidebar and README changes: `Add <Title> post`.
    - `git push -u origin post/<slug>`, then `gh pr create --base main`.
    - Title: `Add <Title> post`. Body follows `.github/pull_request_template.md`:
      - **Summary**: the post's one-line description.
      - **Changes**: the post file, N images, sidebar entry, README row.
      - **Verification**: `pnpm build` result.
      - **Publishing**: the checklist, with items ticked only if actually true. Keep the warning that merging emails subscribers.
    - Give the user the PR URL and stop. Do not merge.

## Merging is publishing

Merging the PR to `main` deploys the site and triggers the notify workflow, which **emails every active subscriber** once the page is live (once per slug). The user decides when to merge. To hold a post back after merging, add `draft: true` to the frontmatter: Starlight leaves drafts out of the build and `scripts/notify.mjs` skips them; remove it later in a normal commit and the daily scan picks the post up.

Preview before merging with `pnpm dev`.
