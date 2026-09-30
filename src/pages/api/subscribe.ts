import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, rateLimited, readBody } from '../../lib/api';

export const prerender = false;

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export const POST: APIRoute = async ({ request }) => {
	const limited = await rateLimited(request, 'subscribe');
	if (limited) return limited;

	const body = await readBody(request);
	if (!body) return json({ error: 'Invalid request' }, 400);
	if (body.website) return json({ ok: true });

	const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
	if (!EMAIL.test(email) || email.length > 254) return json({ error: 'Enter a valid email' }, 400);

	const source = typeof body.source === 'string' ? body.source.slice(0, 100) : 'unknown';
	await env.DB.prepare('INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)').bind(email, source).run();
	return json({ ok: true });
};
