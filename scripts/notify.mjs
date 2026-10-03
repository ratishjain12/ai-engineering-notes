#!/usr/bin/env node
// Usage: node scripts/notify.mjs <docs-file>...   (e.g. src/content/docs/llms/kv-cache.md)
// Env: RESEND_API_KEY, CLOUDFLARE_API_TOKEN (D1 access), CLOUDFLARE_ACCOUNT_ID; DRY_RUN=1 to skip sending and recording;
// TEST_TO=addr sends only to that address, without touching the DB.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { renderEmail } from './email.mjs';

const SITE = 'https://learn.ratishfolio.com';
const FROM = 'AI Engineering Notes <learn@ratishfolio.com>';
const DOCS_DIR = 'src/content/docs/';
const DRY = process.env.DRY_RUN === '1';
const TEST_TO = process.env.TEST_TO;

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
	return { slug, title: field('title'), description: field('description') ?? '' };
}

async function send(post, sub) {
	const unsub = `${SITE}/api/unsubscribe?token=${sub.token}`;
	const { html, text } = renderEmail(post, unsub);
	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			to: sub.email,
			from: FROM,
			subject: `New: ${post.title}`,
			text,
			html,
			headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
		}),
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
	return body.id;
}

const files = process.argv.slice(2).filter((f) => f.startsWith(DOCS_DIR) && /\.mdx?$/.test(f) && !/\/index\.mdx?$/.test(f));
if (!files.length) {
	console.log('No new posts.');
	process.exit(0);
}

for (const file of files) {
	const post = readPost(file);
	if (!post.title) throw new Error(`${file}: missing title`);
	if (TEST_TO) {
		console.log(`${post.slug}: test send to ${TEST_TO}`, await send(post, { email: TEST_TO, token: '0'.repeat(32) }));
		continue;
	}
	if (d1(`SELECT 1 AS x FROM sent_posts WHERE slug = ${sqlStr(post.slug)}`).length) {
		console.log(`${post.slug}: already sent, skipping`);
		continue;
	}
	const subs = d1('SELECT email, token FROM subscribers WHERE unsubscribed_at IS NULL AND token IS NOT NULL');
	console.log(`${post.slug}: ${subs.length} recipients${DRY ? ' (dry run)' : ''}`);
	if (DRY) continue;

	let ok = 0;
	for (const sub of subs) {
		try {
			await send(post, sub);
			ok++;
			await new Promise((r) => setTimeout(r, 600)); // Resend default limit: 2 req/s
		} catch (e) {
			console.error(`  failed ${sub.email}: ${e.message}`);
		}
	}
	if (ok === 0 && subs.length) throw new Error(`${post.slug}: every send failed; not recording`);
	d1(`INSERT INTO sent_posts (slug, recipients) VALUES (${sqlStr(post.slug)}, ${ok})`);
	console.log(`  sent ${ok}/${subs.length}`);
}
