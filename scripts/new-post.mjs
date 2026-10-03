#!/usr/bin/env node
// Usage: pnpm new "KV Cache" [section]   (section defaults to llms)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const [title, section = 'llms'] = process.argv.slice(2);
if (!title) {
	console.error('Usage: pnpm new "Post title" [section]');
	process.exit(1);
}

const DOCS = 'src/content/docs';
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const file = `${DOCS}/${section}/${slug}.md`;
if (existsSync(file)) {
	console.error(`${file} already exists`);
	process.exit(1);
}

const count = (dir) =>
	readdirSync(dir, { withFileTypes: true }).reduce(
		(n, e) => n + (e.isDirectory() ? (e.name.endsWith('-assets') ? 0 : count(`${dir}/${e.name}`)) : /\.mdx?$/.test(e.name) && !e.name.startsWith('index.') ? 1 : 0),
		0,
	);
const n = count(DOCS) + 1;
const day = String(n).padStart(2, '0');
const date = new Date().toLocaleDateString('en-CA');

mkdirSync(`${DOCS}/${section}/${slug}-assets`, { recursive: true });
writeFileSync(
	file,
	`---
title: ${title}
description:
date: ${date}
draft: true
sidebar:
  order: ${n}
  label: 'Day ${day} · ${title}'
---

`,
);

console.log(`Created ${file}
Images go in ${DOCS}/${section}/${slug}-assets/
Preview with: pnpm dev
Publish: fill in description, delete "draft: true", push to main (subscribers are emailed).`);
if (!readFileSync('astro.config.mjs', 'utf8').includes(`directory: '${section}'`)) {
	console.warn(`\nNote: add an autogenerate sidebar group for "${section}" in astro.config.mjs.`);
}
