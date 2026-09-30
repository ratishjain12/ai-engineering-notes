import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

const SITE = 'https://learn.ratishfolio.com';

export const onRequest = defineRouteMiddleware((context) => {
	const { entry, head } = context.locals.starlightRoute;
	if (context.url.pathname === '/' || entry.id === '404') return;

	const image = `${SITE}/og/${entry.id}.png`;
	const alt = `${entry.data.title} | AI Engineering Notes`;
	const date = entry.data.date?.toISOString();

	const isDefaultImage = (attrs: Record<string, unknown> | undefined) =>
		String(attrs?.property ?? '').startsWith('og:image') || String(attrs?.name ?? '').startsWith('twitter:image');
	for (let i = head.length - 1; i >= 0; i--) {
		if (isDefaultImage(head[i].attrs)) head.splice(i, 1);
	}

	head.push(
		{ tag: 'meta', attrs: { property: 'og:image', content: image } },
		{ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
		{ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
		{ tag: 'meta', attrs: { property: 'og:image:alt', content: alt } },
		{ tag: 'meta', attrs: { name: 'twitter:image', content: image } },
		{ tag: 'meta', attrs: { name: 'twitter:image:alt', content: alt } },
	);
	if (date) head.push({ tag: 'meta', attrs: { property: 'article:published_time', content: date } });

	head.push({
		tag: 'script',
		attrs: { type: 'application/ld+json' },
		content: JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'TechArticle',
			headline: entry.data.title,
			description: entry.data.description,
			url: new URL(context.url.pathname, SITE).href,
			image,
			inLanguage: 'en',
			...(date && { datePublished: date, dateModified: date }),
			author: { '@type': 'Person', name: 'Ratish Jain', url: 'https://www.ratishfolio.com' },
			publisher: { '@type': 'Organization', name: 'AI Engineering Notes', url: SITE },
		}),
	});
});
