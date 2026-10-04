#!/usr/bin/env node
// Usage: node scripts/indexnow.mjs <url>...   tells Bing and other IndexNow engines these URLs are new or changed.
const SITE = 'https://learn.ratishfolio.com';
const KEY = 'c49efd67ca561d23404e1b1570c54997';

export async function indexNow(urls) {
	const res = await fetch('https://api.indexnow.org/indexnow', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
		body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
	});
	if (res.status !== 200 && res.status !== 202) throw new Error(`IndexNow ${res.status} ${await res.text()}`);
	return res.status;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const urls = process.argv.slice(2);
	if (!urls.length) throw new Error('No URLs given');
	console.log(`IndexNow accepted ${urls.length} URLs:`, await indexNow(urls));
}
