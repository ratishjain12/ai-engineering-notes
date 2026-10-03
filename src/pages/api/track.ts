import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, rateLimited, readBody } from '../../lib/api';

export const prerender = false;

const clean = (v: unknown, max = 100) => (typeof v === 'string' && v ? v.slice(0, max) : null);

export const POST: APIRoute = async ({ request }) => {
	const limited = await rateLimited(request, 'track');
	if (limited) return limited;

	const body = await readBody(request);
	const source = clean(body?.source, 50);
	const path = clean(body?.path, 200);
	if (!source || !path?.startsWith('/')) return json({ error: 'Invalid request' }, 400);

	await env.DB.prepare('INSERT INTO visits (source, medium, campaign, path) VALUES (?, ?, ?, ?)')
		.bind(source, clean(body?.medium, 50), clean(body?.campaign), path)
		.run();
	return json({ ok: true });
};
