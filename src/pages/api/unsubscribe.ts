import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

const valid = (token: string | null): token is string => !!token && /^[a-f0-9]{32}$/.test(token);

async function unsubscribe(token: string) {
	const row = await env.DB.prepare('SELECT 1 FROM subscribers WHERE token = ?').bind(token).first();
	if (!row) return false;
	await env.DB.prepare("UPDATE subscribers SET unsubscribed_at = datetime('now') WHERE token = ? AND unsubscribed_at IS NULL")
		.bind(token)
		.run();
	return true;
}

const page = (body: string, status = 200) =>
	new Response(
		`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem">${body}<p><a href="/">Back to AI Engineering Notes</a></p>`,
		{ status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
	);

// GET only confirms: link scanners prefetch URLs and must not unsubscribe anyone.
export const GET: APIRoute = ({ url }) => {
	const token = url.searchParams.get('token');
	if (!valid(token)) return page('<p>This unsubscribe link is invalid.</p>', 400);
	return page(
		`<p>Unsubscribe from AI Engineering Notes emails?</p><form method="post" action="/api/unsubscribe?token=${token}"><button type="submit" style="padding:.6rem 1.2rem;font-size:1rem">Yes, unsubscribe</button></form>`,
	);
};

// Used by the confirm button and by RFC 8058 one-click unsubscribe from mail clients.
export const POST: APIRoute = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!valid(token) || !(await unsubscribe(token))) return page('<p>This unsubscribe link is invalid.</p>', 400);
	return page("<p>You're unsubscribed. No more emails.</p>");
};
