import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

async function unsubscribe(token: string | null) {
	if (!token || !/^[a-f0-9]{32}$/.test(token)) return false;
	const res = await env.DB.prepare(
		"UPDATE subscribers SET unsubscribed_at = datetime('now') WHERE token = ? AND unsubscribed_at IS NULL",
	)
		.bind(token)
		.run();
	return res.meta.changes > 0 || !!(await env.DB.prepare('SELECT 1 FROM subscribers WHERE token = ?').bind(token).first());
}

const page = (message: string, status: number) =>
	new Response(
		`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><p>${message}</p><p><a href="/">Back to AI Engineering Notes</a></p>`,
		{ status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
	);

export const GET: APIRoute = async ({ url }) =>
	(await unsubscribe(url.searchParams.get('token')))
		? page("You're unsubscribed. No more emails.", 200)
		: page('This unsubscribe link is invalid.', 400);

// RFC 8058 one-click unsubscribe
export const POST: APIRoute = async ({ url }) =>
	new Response(null, { status: (await unsubscribe(url.searchParams.get('token'))) ? 200 : 400 });
