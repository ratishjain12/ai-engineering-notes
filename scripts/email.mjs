const SITE = 'https://learn.ratishfolio.com';
const SECTIONS = { llms: 'Large Language Models' };

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function renderEmail(post, unsub) {
	const section = SECTIONS[post.slug.split('/')[0]] ?? 'New note';
	const utm = `utm_source=newsletter&utm_medium=email&utm_campaign=${encodeURIComponent(post.slug.replace(/\//g, '-'))}`;
	const url = `${SITE}/${post.slug}/?${utm}`;
	const home = `${SITE}/?${utm}`;

	const text = `${section.toUpperCase()}\n\n${post.title}\n\n${post.description}\n\nRead it: ${url}\n\nWhat should I cover next? Tell me: ${url}#feedback\n\n--\nAI Engineering Notes by Ratish Jain\nUnsubscribe: ${unsub}`;

	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(post.title)}</title></head>
<body style="margin:0;padding:0;background:#f6f1e7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(post.description)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;"><tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">
    <tr><td style="padding:0 4px 20px;">
      <a href="${home}" style="text-decoration:none;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:12px;"><img src="${SITE}/email/logo.png" width="40" height="40" alt="" style="display:block;border:0;border-radius:10px;"></td>
        <td style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:bold;color:#1b1814;">AI Engineering Notes</td>
      </tr></table></a>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid #e4dccb;border-radius:14px;padding:36px 32px;">
      <div style="font-family:'Courier New',monospace;font-size:12px;letter-spacing:1.5px;color:#bf3410;text-transform:uppercase;">${esc(section)}</div>
      <h1 style="margin:12px 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;color:#1b1814;">${esc(post.title)}</h1>
      <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#3d372f;">${esc(post.description)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#bf3410;border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">Read the note &rarr;</a>
      </td></tr></table>
      <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e4dccb;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#564f44;">What should I cover next, or what was unclear? <a href="${url}#feedback" style="color:#bf3410;font-weight:bold;">Tell me in one line &rarr;</a></p>
    </td></tr>
    <tr><td style="padding:20px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#736b5d;">
      You're getting this because you subscribed at <a href="${home}" style="color:#736b5d;">learn.ratishfolio.com</a>. Landed in Promotions? Drag it to Primary so you don't miss the next one.<br>
      Written by Ratish Jain &middot; <a href="https://x.com/ratishtwts" style="color:#736b5d;">@ratishtwts</a> &middot; <a href="${unsub}" style="color:#736b5d;">Unsubscribe</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

	return { html, text };
}
