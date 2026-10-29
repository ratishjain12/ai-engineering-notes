import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { sectionTitles } from './lib/sections';

const SITE = 'https://learn.ratishfolio.com';

export const onRequest = defineRouteMiddleware((context) => {
	const { entry, head } = context.locals.starlightRoute;
	if (context.url.pathname === '/' || entry.id === '404') return;

	const image = `${SITE}/og/${entry.id}.png`;
	const alt = `${entry.data.title} | AI Engineering Notes`;
	const date = entry.data.date?.toISOString();
	const url = new URL(context.url.pathname, SITE).href;
	const section = entry.id.split('/')[0];
	const isHub = entry.id in sectionTitles;
	const crumbs = [
		{ name: 'Home', url: `${SITE}/` },
		...(section in sectionTitles ? [{ name: sectionTitles[section], url: `${SITE}/${section}/` }] : []),
		...(isHub ? [] : [{ name: entry.data.title, url }]),
	];

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
			'@type': isHub ? 'CollectionPage' : 'TechArticle',
			headline: entry.data.title,
			description: entry.data.description,
			url,
			image,
			inLanguage: 'en',
			...(date && { datePublished: date, dateModified: date }),
			author: { '@type': 'Person', name: 'Ratish Jain', url: 'https://www.ratishfolio.com' },
			publisher: { '@type': 'Organization', name: 'AI Engineering Notes', url: SITE },
		}),
	});

	head.push({
		tag: 'script',
		attrs: { type: 'application/ld+json' },
		content: JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
		}),
	});
});
