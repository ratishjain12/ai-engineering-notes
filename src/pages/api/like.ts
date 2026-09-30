import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ipHash, isSlug, json, rateLimited, readBody } from '../../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const slug = url.searchParams.get('slug');
	if (!isSlug(slug)) return json({ error: 'Invalid slug' }, 400);
	const row = await env.DB.prepare('SELECT count FROM likes WHERE slug = ?').bind(slug).first<{ count: number }>();
	return json({ count: row?.count ?? 0 });
};

export const POST: APIRoute = async ({ request }) => {
	const limited = await rateLimited(request, 'like');
	if (limited) return limited;

	const body = await readBody(request);
	if (!body || !isSlug(body.slug)) return json({ error: 'Invalid request' }, 400);

	const seen = await env.DB.prepare('INSERT OR IGNORE INTO likes_seen (slug, ip_hash) VALUES (?, ?)')
		.bind(body.slug, await ipHash(request, body.slug))
		.run();
	if (seen.meta.changes === 0) {
		const row = await env.DB.prepare('SELECT count FROM likes WHERE slug = ?').bind(body.slug).first<{ count: number }>();
		return json({ count: row?.count ?? 0 });
	}

	const row = await env.DB.prepare(
		'INSERT INTO likes (slug, count) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET count = count + 1 RETURNING count',
	)
		.bind(body.slug)
		.first<{ count: number }>();
	return json({ count: row?.count ?? 1 });
};
