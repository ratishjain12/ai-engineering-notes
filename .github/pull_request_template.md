<!--
Title: imperative sentence, under 70 chars, no trailing period.
  New post:  Add <Title> post
  Other:     Fix …, Update …, Remove …
Branch:      post/<slug>, fix/<what>, feat/<what>, chore/<what>
Merges are squashed, so the title becomes the commit message on main.
-->

## Summary

<!-- One or two sentences: what changes and why. -->

## Changes

-

## Verification

- [ ] `pnpm build` passes
- [ ] Checked locally with `pnpm dev` (if the site changed)

## Publishing

<!-- Delete this section if the PR doesn't add a post. -->

- [ ] `description` is filled in (it is the email body and share card)
- [ ] Every image has alt text; formula images start with `Formula:`
- [ ] Sidebar entry and README topic row added
- [ ] I'm ready to email subscribers: **merging this PR publishes the post and sends the email** (use `draft: true` to hold it back)
