#!/usr/bin/env node
// Usage: node --env-file=.env scripts/tts.mjs <docs-file> [--dry] [--html <path|url>]
// Narrates a post with OpenAI TTS through Cloudflare AI Gateway, uploads the mp3 to R2 and writes
// <slug>-assets/audio.json: the audio URL plus per-sentence timings the Listen player highlights.
// Text comes from the rendered page (dist/client/<slug>/index.html, else the dev server on :4321),
// so the narration is exactly what readers see. Code and diagram blocks are not read verbatim: a small
// LLM writes a spoken version of each (printed below, cached in .tts-cache). --dry stops before any TTS.
// Needs ffmpeg and a wrangler login.
// Env: CLOUDFLARE_ACCOUNT_ID, CF_GATEWAY_ID, CF_AIG_TOKEN, R2_BUCKET, R2_PUBLIC_URL;
//      OPENAI_TTS_MODEL, OPENAI_TTS_VOICE, OPENAI_NARRATION_MODEL (default gpt-4o-mini).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { blockText, codeLang, fingerprint, isCode, speechBlocks } from '../src/lib/speech.js';

const MODEL = process.env.OPENAI_TTS_MODEL ?? 'tts-1';
const VOICE = process.env.OPENAI_TTS_VOICE ?? 'alloy';
const NARRATION_MODEL = process.env.OPENAI_NARRATION_MODEL ?? 'gpt-4o-mini';
const RATE = 24000; // OpenAI `pcm` output: 24kHz, 16-bit, mono
const CACHE_DIR = '.tts-cache';
const CONCURRENCY = 4;
const USD_PER_MILLION_CHARS = { 'tts-1': 15, 'tts-1-hd': 30 };

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const htmlArg = args.includes('--html') ? args[args.indexOf('--html') + 1] : undefined;
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--html');
if (!file) throw new Error('Usage: node --env-file=.env scripts/tts.mjs <docs-file> [--dry] [--html <path|url>]');
const dry = flag('--dry');

for (const k of ['CLOUDFLARE_ACCOUNT_ID', 'CF_GATEWAY_ID', 'CF_AIG_TOKEN', ...(dry ? [] : ['R2_BUCKET', 'R2_PUBLIC_URL'])]) {
	if (!process.env[k]) throw new Error(`Missing env ${k}`);
}
const GATEWAY = `https://gateway.ai.cloudflare.com/v1/${process.env.CLOUDFLARE_ACCOUNT_ID}/${process.env.CF_GATEWAY_ID}/openai`;
const gatewayHeaders = { 'Content-Type': 'application/json', 'cf-aig-authorization': `Bearer ${process.env.CF_AIG_TOKEN}` };

const slug = file.replace(/^.*\/content\/docs\//, '').replace(/\.mdx?$/, '');

async function loadHtml() {
	const source = htmlArg ?? (existsSync(`dist/client/${slug}/index.html`) ? `dist/client/${slug}/index.html` : `http://localhost:4321/${slug}/`);
	console.log(`Reading ${source}`);
	if (!/^https?:/.test(source)) return readFileSync(source, 'utf8');
	const res = await fetch(source).catch(() => null);
	if (!res?.ok) throw new Error(`Could not load ${source}. Run \`pnpm build\` (or \`astro dev\`) first, or pass --html.`);
	return res.text();
}

const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
function sentenceSpans(text) {
	const spans = [];
	for (const { index, segment } of segmenter.segment(text)) {
		const a = index + segment.length - segment.trimStart().length;
		const b = index + segment.trimEnd().length;
		if (b > a && /[\p{L}\p{N}]/u.test(text.slice(a, b))) spans.push([a, b]);
	}
	return spans;
}

const { document } = parseHTML(await loadHtml());
const root = document.querySelector('.sl-markdown-content');
if (!root) throw new Error('No .sl-markdown-content in the page');

mkdirSync(CACHE_DIR, { recursive: true });

const cacheKey = (...parts) => createHash('sha1').update(parts.join('|')).digest('hex');

async function post(path, body) {
	for (let attempt = 1; ; attempt++) {
		const res = await fetch(`${GATEWAY}/${path}`, { method: 'POST', headers: gatewayHeaders, body: JSON.stringify(body) }).catch(() => null);
		if (res?.ok) return res;
		const retryable = !res || res.status === 429 || res.status >= 500;
		if (!retryable || attempt === 4) throw new Error(`${path} ${res?.status ?? 'network'}: ${res ? await res.text() : ''}`);
		await new Promise((r) => setTimeout(r, 1500 * attempt));
	}
}

const NARRATION_PROMPT = `You turn a code or diagram block from a technical article into a short script that a narrator reads aloud to a listener who cannot see the screen.
- Be faithful and minimal: say only what the block says, in the fewest words. Never add explanation, interpretation, opinion or filler such as "this shows", "this illustrates" or "it is important"; the article already explains it.
- Short lines, flows and lists: read the content as written, line by line. Say "then" only where the block literally contains an arrow ("The → cat → is" becomes "The, then cat, then is"); without arrows, never add "then". Say "equals" for "=".
- Labels printed under or beside text (t1, t2, ...): say "labelled" ("the cat is sitting, labelled t1 and t2").
- Never describe layout or drawing ("arrows point up", "boxes", "on the left"). Say what the labels and relationships are: a labelled token sequence is read as the sequence.
- Math and probabilities: say them naturally ("P(t2 | t1)" becomes "the probability of t2 given t1"). Say subscripts as "sub": Q_it is "Q sub it", Q₁ is "Q one".
- Real source code: one or two sentences on what it does; never read syntax or punctuation.
- Plain text only: no markdown, no quotation marks, no preamble. The surrounding text is context only; do not repeat it.`;

// One line per sentence, so the voice pauses between lines that have no punctuation of their own.
const toSpeech = (text) =>
	`${text
		.split('\n')
		.map((l) => l.replace(/\s+/g, ' ').trim().replace(/[.,;:]+$/, ''))
		.filter(Boolean)
		.reduce((out, l, i) => (i === 0 ? l : `${out}${/^then\b/i.test(l) ? ', ' : '. '}${l}`), '')}.`;

async function narrateCode({ code, lang, before, after }) {
	const user = `Article: ${title}\nText before the block: ${before}\nText after the block: ${after}\nLanguage: ${lang || 'plain text'}\nBlock:\n${code}`;
	const cached = join(CACHE_DIR, `${cacheKey(NARRATION_MODEL, NARRATION_PROMPT, user)}.txt`);
	if (existsSync(cached)) return toSpeech(readFileSync(cached, 'utf8'));
	const res = await post('chat/completions', {
		model: NARRATION_MODEL,
		temperature: 0.2,
		messages: [{ role: 'system', content: NARRATION_PROMPT }, { role: 'user', content: user }],
	});
	const text = (await res.json()).choices[0].message.content.trim();
	writeFileSync(cached, text);
	return toSpeech(text);
}

const title = document.querySelector('h1')?.textContent ?? slug;
const blocks = speechBlocks(root).map((el) => {
	const code = isCode(el);
	const text = blockText(el);
	return { code, lang: code ? codeLang(el) : '', tag: code ? 'code' : el.tagName.toLowerCase(), text, h: fingerprint(text), spans: code ? [] : sentenceSpans(text) };
});

for (const [i, b] of blocks.entries()) {
	if (!b.code) continue;
	const prose = (list) => list.find((x) => !x.code)?.text.slice(0, 300) ?? '';
	b.spoken = await narrateCode({ code: b.text, lang: b.lang, before: prose(blocks.slice(0, i).reverse()), after: prose(blocks.slice(i + 1)) });
	b.spans = [[0, b.spoken.length]];
	console.log(`  code ${b.text.split('\n')[0].slice(0, 40)}...\n    -> ${b.spoken}`);
}

const spoken = (b) => (b.code ? b.spoken : b.text);
const chars = blocks.reduce((n, b) => n + b.spans.reduce((m, [a, e]) => m + e - a, 0), 0);
const sentenceCount = blocks.reduce((n, b) => n + b.spans.length, 0);
const cost = ((chars / 1e6) * (USD_PER_MILLION_CHARS[MODEL] ?? 15)).toFixed(3);
console.log(`${slug}: ${blocks.length} blocks (${blocks.filter((b) => b.code).length} code), ${sentenceCount} sentences, ${chars} chars (~$${cost} on ${MODEL})`);
if (dry) process.exit(0);

async function synthesize(text) {
	const cached = join(CACHE_DIR, `${cacheKey(MODEL, VOICE, text)}.pcm`);
	if (existsSync(cached)) return readFileSync(cached);
	const res = await post('audio/speech', { model: MODEL, voice: VOICE, input: text, response_format: 'pcm' });
	const pcm = Buffer.from(await res.arrayBuffer());
	writeFileSync(cached, pcm);
	return pcm;
}

const jobs = blocks.flatMap((b, bi) => b.spans.map(([a, e], si) => ({ bi, si, text: spoken(b).slice(a, e) })));
const audio = new Array(jobs.length);
let next = 0;
let done = 0;
await Promise.all(
	Array.from({ length: CONCURRENCY }, async () => {
		while (next < jobs.length) {
			const i = next++;
			audio[i] = await synthesize(jobs[i].text);
			process.stdout.write(`\r  synthesized ${++done}/${jobs.length}`);
		}
	}),
);
console.log();

const silence = (sec) => Buffer.alloc(Math.round(sec * RATE) * 2);
const blockGap = (b, nextBlock) => (nextBlock && /^h\d$/.test(nextBlock.tag) ? 0.85 : /^h\d$/.test(b.tag) ? 0.6 : /^(li|th|td)$/.test(b.tag) ? 0.4 : 0.55);

const parts = [silence(0.3)];
let cursor = 0.3;
let ji = 0;
const timings = blocks.map((b, bi) => {
	const s = b.spans.map(([a, e], si) => {
		const pcm = audio[ji++];
		const start = cursor;
		cursor += pcm.length / 2 / RATE;
		parts.push(pcm);
		const gap = si < b.spans.length - 1 ? 0.25 : blockGap(b, blocks[bi + 1]);
		parts.push(silence(gap));
		cursor += gap;
		return [+start.toFixed(3), +(start + pcm.length / 2 / RATE).toFixed(3), b.code ? -1 : a, b.code ? -1 : e];
	});
	return { h: b.h, s };
});

const pcmAll = Buffer.concat(parts);
const hash = createHash('sha1').update(pcmAll).digest('hex').slice(0, 10);
const pcmFile = join(tmpdir(), `tts-${hash}.pcm`);
const mp3File = join(tmpdir(), `tts-${hash}.mp3`);
writeFileSync(pcmFile, pcmAll);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', pcmFile, '-c:a', 'libmp3lame', '-b:a', '64k', mp3File]);

const key = `${slug}.${hash}.mp3`;
console.log(`Uploading r2://${process.env.R2_BUCKET}/${key}`);
execFileSync(
	'pnpm',
	['exec', 'wrangler', 'r2', 'object', 'put', `${process.env.R2_BUCKET}/${key}`, '--file', mp3File, '--content-type', 'audio/mpeg', '--cache-control', 'public, max-age=31536000, immutable', '--remote'],
	{ stdio: 'inherit' },
);

const manifestPath = `src/content/docs/${slug}-assets/audio.json`;
mkdirSync(`src/content/docs/${slug}-assets`, { recursive: true });
const duration = +(pcmAll.length / 2 / RATE).toFixed(2);
writeFileSync(manifestPath, `${JSON.stringify({ url: `${process.env.R2_PUBLIC_URL}/${key}`, duration, model: MODEL, voice: VOICE, blocks: timings })}\n`);
console.log(`Wrote ${manifestPath} (${duration}s)`);
