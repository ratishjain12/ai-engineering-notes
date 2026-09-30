import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '../../lib/og';

export const getStaticPaths = (async () => {
	const docs = await getCollection('docs');
	return docs
		.filter((d) => d.id !== 'index' && d.id !== '404')
		.map((d) => ({
			params: { slug: d.id },
			props: { title: d.data.title, description: d.data.description, label: d.id.split('/')[0].replace(/^llms$/, 'Large Language Models') },
		}));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
	const { title, description, label } = props as { title: string; description?: string; label: string };
	const png = await renderOg(title, description, label);
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
