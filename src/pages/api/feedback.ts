import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isSlug, json, rateLimited, readBody } from '../../lib/api';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const limited = await rateLimited(request, 'feedback');
	if (limited) return limited;

	const body = await readBody(request);
	if (!body || !isSlug(body.slug)) return json({ error: 'Invalid request' }, 400);
	if (body.website) return json({ ok: true });

	const message = typeof body.message === 'string' ? body.message.trim() : '';
	if (message.length < 3 || message.length > 2000) return json({ error: 'Write a few words first' }, 400);

	await env.DB.prepare('INSERT INTO feedback (slug, message) VALUES (?, ?)').bind(body.slug, message).run();
	return json({ ok: true });
};
