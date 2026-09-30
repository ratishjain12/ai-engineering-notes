import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

const SITE = 'https://learn.ratishfolio.com';

export const onRequest = defineRouteMiddleware((context) => {
	const { entry, head } = context.locals.starlightRoute;
	if (context.url.pathname === '/' || entry.id === '404') return;

	head.push({
		tag: 'script',
		attrs: { type: 'application/ld+json' },
		content: JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'TechArticle',
			headline: entry.data.title,
			description: entry.data.description,
			url: new URL(context.url.pathname, SITE).href,
			image: `${SITE}/og-default.png`,
			inLanguage: 'en',
			author: { '@type': 'Person', name: 'Ratish Jain' },
			publisher: { '@type': 'Organization', name: 'AI Engineering Notes', url: SITE },
		}),
	});
});
