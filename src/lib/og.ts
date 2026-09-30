import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const font = (pkg: string, file: string) => readFileSync(join(process.cwd(), 'node_modules', pkg, 'files', file));

const fonts = [
	{ name: 'Newsreader', data: font('@fontsource/newsreader', 'newsreader-latin-500-normal.woff'), weight: 500 as const, style: 'normal' as const },
	{ name: 'IBM Plex Sans', data: font('@fontsource/ibm-plex-sans', 'ibm-plex-sans-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
	{ name: 'JetBrains Mono', data: font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
];

const logo =
	'data:image/svg+xml;base64,' +
	Buffer.from(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#1b1814"/><path d="M8 20a8 8 0 0 1 16 0z" fill="#ff6f40"/><rect x="6" y="22.5" width="20" height="2.4" rx="1.2" fill="#f6f1e7"/><rect x="10" y="26.5" width="12" height="1.6" rx=".8" fill="#f6f1e7" opacity=".4"/></svg>',
	).toString('base64');

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

export async function renderOg(title: string, description: string | undefined, label: string) {
	const tree = el(
		'div',
		{ width: 1200, height: 630, background: '#f6f1e7', color: '#1b1814', display: 'flex', flexDirection: 'column', padding: '64px 72px', position: 'relative' },
		[
			el('div', { display: 'flex', alignItems: 'center', gap: 20 }, [
				{ type: 'img', props: { src: logo, width: 64, height: 64 } },
				el('div', { fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 28, color: '#bf3410', letterSpacing: '-0.03em' }, 'AI Engineering Notes'),
			]),
			el('div', { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 28 }, [
				el('div', { fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 24, color: '#736b5d', textTransform: 'uppercase', letterSpacing: '0.08em' }, label),
				el('div', { fontFamily: 'Newsreader', fontWeight: 500, fontSize: title.length > 28 ? 76 : 104, lineHeight: 1.05, letterSpacing: '-0.025em' }, title),
				description
					? el('div', { fontFamily: 'IBM Plex Sans', fontSize: 30, lineHeight: 1.4, color: '#564f44', maxWidth: 900 }, description)
					: null,
			]),
			el('div', { fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 26, color: '#736b5d' }, 'learn.ratishfolio.com'),
			el('div', { position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, background: '#bf3410' }),
		],
	);
	const svg = await satori(tree as never, { width: 1200, height: 630, fonts });
	return new Resvg(svg).render().asPng();
}
