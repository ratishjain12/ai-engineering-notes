import { env } from 'cloudflare:workers';

export const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const isSlug = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9][a-z0-9/-]{0,99}$/.test(v);

export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
	try {
		const body = await request.json();
		return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

const clientIp = (request: Request) => request.headers.get('cf-connecting-ip') ?? 'local';

export async function rateLimited(request: Request, route: string): Promise<Response | null> {
	const { success } = await env.LIMITER.limit({ key: `${route}:${clientIp(request)}` });
	return success ? null : json({ error: 'Too many requests. Try again in a minute.' }, 429);
}

export async function ipHash(request: Request, slug: string): Promise<string> {
	const data = new TextEncoder().encode(`${env.IP_SALT ?? ''}:${slug}:${clientIp(request)}`);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
