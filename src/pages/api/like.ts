import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isSlug, json, readBody } from '../../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const slug = url.searchParams.get('slug');
	if (!isSlug(slug)) return json({ error: 'Invalid slug' }, 400);
	const row = await env.DB.prepare('SELECT count FROM likes WHERE slug = ?').bind(slug).first<{ count: number }>();
	return json({ count: row?.count ?? 0 });
};

export const POST: APIRoute = async ({ request }) => {
	const body = await readBody(request);
	if (!body || !isSlug(body.slug)) return json({ error: 'Invalid request' }, 400);
	const row = await env.DB.prepare(
		'INSERT INTO likes (slug, count) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET count = count + 1 RETURNING count',
	)
		.bind(body.slug)
		.first<{ count: number }>();
	return json({ count: row?.count ?? 1 });
};
