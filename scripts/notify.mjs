#!/usr/bin/env node
// Usage: node scripts/notify.mjs <docs-file>...   emails those posts
//        node scripts/notify.mjs --scan           emails every published post not yet sent
//        node scripts/notify.mjs --due            prints {"pending":[slug],"undeployed":[slug]} for due, unsent posts; sends nothing
// A post's `date` is an ISO timestamp (date-only means 00:00 UTC); it is due once that instant has passed.
// Env: RESEND_API_KEY, CLOUDFLARE_API_TOKEN (D1 access), CLOUDFLARE_ACCOUNT_ID;
// DRY_RUN=1 skips sending and recording; TEST_TO=addr sends only to that address, without touching the DB.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { renderEmail } from './email.mjs';

const SITE = 'https://learn.ratishfolio.com';
const FROM = 'AI Engineering Notes <learn@ratishfolio.com>';
const DOCS_DIR = 'src/content/docs/';
const DRY = process.env.DRY_RUN === '1';
const TEST_TO = process.env.TEST_TO;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const required = [...(DRY || process.argv.includes('--due') ? [] : ['RESEND_API_KEY']), ...(process.env.CI ? ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'] : [])];
for (const k of required) if (!process.env[k]) throw new Error(`Missing env ${k}`);

const d1 = (sql) => {
	const out = execFileSync(
		'pnpm',
		['exec', 'wrangler', 'd1', 'execute', 'learn-ai-engagement', '--remote', '--json', '--command', sql],
		{ encoding: 'utf8', maxBuffer: 1 << 26 },
	);
	return JSON.parse(out.slice(out.indexOf('[')))[0].results;
};

const sqlStr = (s) => `'${s.replace(/'/g, "''")}'`;

function readPost(file) {
	const src = readFileSync(file, 'utf8');
	const fm = src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
	const field = (k) => fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
	const slug = file.slice(DOCS_DIR.length).replace(/\.mdx?$/, '');
	return { slug, title: field('title'), description: field('description') ?? '', date: field('date'), draft: field('draft') === 'true' };
}

function listDocs(dir = DOCS_DIR) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? listDocs(`${dir}${e.name}/`) : /\.mdx?$/.test(e.name) ? [`${dir}${e.name}`] : [],
	);
}

const isLive = async (slug) => (await fetch(`${SITE}/${slug}/`, { redirect: 'follow' }).catch(() => null))?.ok === true;

const isSent = (slug) => d1(`SELECT 1 AS x FROM sent_posts WHERE slug = ${sqlStr(slug)}`).length > 0;

function dueAt(post) {
	const ms = new Date(post.date).getTime();
	if (Number.isNaN(ms)) throw new Error(`${post.slug}: invalid date "${post.date}"`);
	return ms;
}

async function waitUntilLive(slug) {
	const url = `${SITE}/${slug}/`;
	for (let i = 0; i < 80; i++) {
		if (await isLive(slug)) return;
		if (i === 0) console.log(`  waiting for ${url} to go live...`);
		await sleep(15_000);
	}
	throw new Error(`${url} not live after 20 minutes`);
}

async function send(post, sub) {
	const unsub = `${SITE}/api/unsubscribe?token=${sub.token}`;
	const { html, text } = renderEmail(post, unsub);
	const body = JSON.stringify({
		to: sub.email,
		from: FROM,
		subject: `New: ${post.title}`,
		text,
		html,
		headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
	});
	for (let attempt = 1; ; attempt++) {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
			body,
		}).catch(() => null);
		if (res?.ok) return (await res.json()).id;
		const retryable = !res || res.status === 429 || res.status >= 500;
		if (!retryable || attempt === 4) throw new Error(`${res?.status ?? 'network'} ${res ? JSON.stringify(await res.json().catch(() => ({}))) : ''}`);
		await sleep(2000 * attempt);
	}
}

const scan = process.argv.includes('--scan');
const due = process.argv.includes('--due');
const files = (scan || due ? listDocs() : process.argv.slice(2))
	.filter((f) => f.startsWith(DOCS_DIR) && /\.mdx?$/.test(f) && !/\/index\.mdx?$/.test(f));

if (due) {
	const pending = [];
	const undeployed = [];
	for (const file of files) {
		const post = readPost(file);
		if (!post.date || post.draft || dueAt(post) > Date.now() || isSent(post.slug)) continue;
		pending.push(post.slug);
		if (!(await isLive(post.slug))) undeployed.push(post.slug);
	}
	console.log(JSON.stringify({ pending, undeployed }));
	process.exit(0);
}

if (!files.length) {
	console.log('No new posts.');
	process.exit(0);
}

let failed = false;

for (const file of files) {
	const post = readPost(file);
	if (!post.title) throw new Error(`${file}: missing title`);
	if (scan && !post.date) continue;
	if (post.draft) {
		console.log(`${post.slug}: draft, skipping`);
		continue;
	}
	if (post.date && dueAt(post) > Date.now()) {
		console.log(`${post.slug}: scheduled for ${post.date}, skipping`);
		continue;
	}
	if (TEST_TO) {
		console.log(`${post.slug}: test send to ${TEST_TO}`, await send(post, { email: TEST_TO, token: '0'.repeat(32) }));
		continue;
	}
	if (isSent(post.slug)) {
		if (!scan) console.log(`${post.slug}: already sent, skipping`);
		continue;
	}

	const subs = d1(
		`SELECT email, token FROM subscribers WHERE unsubscribed_at IS NULL AND token IS NOT NULL
		 AND email NOT IN (SELECT email FROM deliveries WHERE slug = ${sqlStr(post.slug)})`,
	);
	console.log(`${post.slug}: ${subs.length} recipients${DRY ? ' (dry run)' : ''}`);
	if (DRY) continue;

	await waitUntilLive(post.slug);

	let ok = 0;
	for (const sub of subs) {
		try {
			await send(post, sub);
			d1(`INSERT OR IGNORE INTO deliveries (slug, email) VALUES (${sqlStr(post.slug)}, ${sqlStr(sub.email)})`);
			ok++;
			await sleep(600); // Resend default limit: 2 req/s
		} catch (e) {
			failed = true;
			console.error(`  failed ${sub.email}: ${e.message}`);
		}
	}
	console.log(`  sent ${ok}/${subs.length}`);
	if (ok === subs.length) {
		const total = d1(`SELECT COUNT(*) AS n FROM deliveries WHERE slug = ${sqlStr(post.slug)}`)[0].n;
		d1(`INSERT INTO sent_posts (slug, recipients) VALUES (${sqlStr(post.slug)}, ${total})`);
	}
}

if (failed) {
	console.error('Some sends failed; re-run the workflow to retry only those.');
	process.exit(1);
}
