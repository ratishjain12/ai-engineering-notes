// Shared by scripts/tts.mjs (narration) and the Listen player (highlighting), so both agree on what is spoken.
export const SPEECH_SELECTOR = 'h2,h3,h4,h5,h6,p,li,th,td';
const CODE_SELECTOR = '.expressive-code';
const SKIP_SELECTOR = `pre,figure,nav,svg,script,style,${CODE_SELECTOR},.sl-anchor-link,.sr-only`;

export const normalize = (s) => s.replace(/\s+/g, ' ').trim();

export const isCode = (el) => el.matches(CODE_SELECTOR);
export const codeLang = (el) => el.querySelector('pre')?.getAttribute('data-language') ?? '';
const codeText = (el) => [...el.querySelectorAll('.ec-line')].map((l) => l.textContent).join('\n');

// Text nodes owned by a block: nested blocks (a list inside an li) are separate blocks.
export function blockTextNodes(el, out = []) {
	for (const n of el.childNodes) {
		if (n.nodeType === 3) out.push(n);
		else if (n.nodeType === 1 && !n.matches(SPEECH_SELECTOR) && !n.matches(SKIP_SELECTOR)) blockTextNodes(n, out);
	}
	return out;
}

// Code blocks keep their line breaks; the narration for them is written separately, not read verbatim.
export const blockText = (el) => (isCode(el) ? codeText(el) : normalize(blockTextNodes(el).map((n) => n.data).join('')));

export function speechBlocks(root) {
	return [...root.querySelectorAll(`${SPEECH_SELECTOR},${CODE_SELECTOR}`)].filter(
		(el) => !el.parentElement.closest(SKIP_SELECTOR) && /[\p{L}\p{N}]/u.test(blockText(el)),
	);
}

// Letters and digits only, so smart quotes and spacing differences between renderers don't matter.
export function fingerprint(text) {
	let h = 0x811c9dc5;
	for (const ch of text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')) h = Math.imul(h ^ ch.codePointAt(0), 0x01000193);
	return (h >>> 0).toString(36);
}
