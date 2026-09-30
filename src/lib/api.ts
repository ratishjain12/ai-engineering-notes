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
