// Builds the mesamesa.app site into ./dist. No dependencies: node build.mjs
//
//   node build.mjs            build; warn about unfilled [placeholders]
//   node build.mjs --strict   same, but fail if any remain (used by the deploy)
//
// Pages: / (landing), /privacy/, /terms/ and /support/ (from content/*.md), and
// /auth/confirm/ and /auth/reset/ (where email links land, then open the app).
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'dist');
const strict = process.argv.includes('--strict');

const SITE = 'https://mesamesa.app';
const EMAIL = 'support@mesamesa.app';

// --- a small Markdown subset: headings, paragraphs, lists, tables, links, bold, italic ---

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function inline(text) {
  return esc(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s).,]|$)/g, '$1<em>$2</em>');
}

function markdown(src) {
  const lines = src.replace(/\r/g, '').split('\n');
  const html = [];
  const toc = [];
  let i = 0;
  const isBlank = (l) => l === undefined || l.trim() === '';
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
    } else if (/^#{1,3} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      const text = line.slice(level + 1).trim();
      if (level === 2) toc.push([slug(text), inline(text)]);
      html.push(level === 1 ? `<h1>${inline(text)}</h1>` : `<h${level} id="${slug(text)}">${inline(text)}</h${level}>`);
      i++;
    } else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
        i++;
      }
      const [head, , ...body] = rows; // rows[1] is the |---| separator
      html.push(
        '<div class="table"><table><thead><tr>' +
          head.map((c) => `<th>${inline(c)}</th>`).join('') +
          '</tr></thead><tbody>' +
          body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
          '</tbody></table></div>',
      );
    } else if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || (/^\s+\S/.test(lines[i]) && items.length))) {
        if (lines[i].startsWith('- ')) items.push(lines[i].slice(2));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      html.push('<ul>' + items.map((t) => `<li>${inline(t)}</li>`).join('') + '</ul>');
    } else {
      const para = [];
      while (i < lines.length && !isBlank(lines[i]) && !/^(#{1,3} |\||- )/.test(lines[i])) para.push(lines[i++].trim());
      html.push(`<p>${inline(para.join(' '))}</p>`);
    }
  }
  return { html: html.join('\n'), toc };
}

/** [Text in brackets] that isn't a link: something still to fill in. */
const placeholders = (src) => [...src.matchAll(/\[([^\]]+)\](?!\()/g)].map((m) => m[1]);

// --- layout ---

// Same look as the app: Inter Tight in four weights, a neutral base, and
// Ember as the one color. Keep the two in step.
const css = `
:root{--bg:#FAFAFA;--surface:#FFFFFF;--soft:#F3F3F3;--text:#111111;--muted:rgba(17,17,17,.74);--faint:rgba(17,17,17,.6);--line:rgba(17,17,17,.08);--ember:#B84C24;--ember-hover:#9C3F1C;--on-ember:#FFFFFF;--accent:#B84C24;--shadow:0 18px 40px -22px rgba(17,17,17,.3);color-scheme:light;--sans:"Inter Tight",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#111111;--surface:#1B1B1B;--soft:rgba(250,250,250,.08);--text:#FAFAFA;--muted:rgba(250,250,250,.7);--faint:rgba(250,250,250,.55);--line:rgba(250,250,250,.1);--on-ember:#FAFAFA;--accent:#F0A98A;--shadow:none;color-scheme:dark}}
:root[data-theme=dark]{--bg:#111111;--surface:#1B1B1B;--soft:rgba(250,250,250,.08);--text:#FAFAFA;--muted:rgba(250,250,250,.7);--faint:rgba(250,250,250,.55);--line:rgba(250,250,250,.1);--on-ember:#FAFAFA;--accent:#F0A98A;--shadow:none;color-scheme:dark}
:root[data-theme=light]{color-scheme:light}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font:400 17px/1.6 var(--sans);-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-underline-offset:3px}
em{font-style:normal;color:var(--accent)}
.wrap{max-width:1240px;margin:0 auto;padding:0 24px}
.docs{display:grid;gap:8px 72px;grid-template-columns:minmax(0,1fr)}
.doc{max-width:760px;min-width:0}
.toc{font:400 14px/1.4 var(--sans);border-bottom:1px solid var(--line);padding:4px 0 18px;margin-bottom:8px}
.toc p{font:600 11px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin:0 0 12px}
.toc ol{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.toc li{margin:0}
.toc a{display:block;color:var(--muted);text-decoration:none;padding:7px 12px;border-radius:999px;background:var(--soft)}
.toc a:hover,.toc a[aria-current]{color:var(--text)}
.toc .alt{margin-top:22px}
.toc .alt a{display:inline;padding:0;background:none;color:var(--accent)}
@media(min-width:1000px){.docs{grid-template-columns:240px minmax(0,1fr)}.toc{position:sticky;top:24px;align-self:start;max-height:calc(100vh - 48px);overflow-y:auto;border:0;padding:30px 0 0;margin:0}.toc ol{display:block;border-left:1px solid var(--line)}.toc a{background:none;border-radius:0;padding:6px 0 6px 16px;margin-left:-1px;border-left:2px solid transparent}.toc a[aria-current]{border-left-color:var(--accent)}}
header.site{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.brand{display:flex;align-items:center;gap:8px;color:var(--accent);text-decoration:none;font:800 22px/1 var(--sans);letter-spacing:.14em}
.brand img{width:34px;height:34px}
nav{display:flex;align-items:center;gap:22px;font:400 15px/1 var(--sans)}
nav a{color:var(--muted);text-decoration:none}
nav a:hover,nav a[aria-current]{color:var(--text)}
button.theme{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--text);cursor:pointer}
button.theme:hover{border-color:var(--faint)}
button.theme:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
button.theme svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
button.theme .sun{display:none}
:root[data-theme=dark] button.theme .sun{display:block}
:root[data-theme=dark] button.theme .moon{display:none}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) button.theme .sun{display:block}:root:not([data-theme=light]) button.theme .moon{display:none}}
nav a.btn{color:var(--on-ember);background:var(--ember);padding:10px 16px;border-radius:999px;font-weight:600}
nav a.btn:hover{background:var(--ember-hover);color:var(--on-ember)}
@media(max-width:620px){header.site{flex-wrap:wrap;gap:14px 12px}nav{gap:10px 18px;flex-wrap:wrap}nav a.btn{padding:9px 14px}}
main{padding:24px 0 72px}
h1,h2,h3{font-family:var(--sans);font-weight:700;letter-spacing:-.02em;text-wrap:balance}
h1{font-size:clamp(30px,5vw,40px);font-weight:800;line-height:1.1;letter-spacing:-.03em;margin:8px 0 18px}
h2{font-size:22px;line-height:1.25;margin:44px 0 10px;padding-top:28px;border-top:1px solid var(--line);scroll-margin-top:16px}
.doc h2:first-of-type{border-top:0;padding-top:0}
h3{font-size:17px;line-height:1.3;margin:26px 0 4px}
p,ul{margin:0 0 16px}
ul{padding-left:22px}
li{margin-bottom:8px}
strong{font-weight:600}
.back{display:inline-block;margin-top:40px;font:600 15px var(--sans);text-decoration:none}
.table{overflow-x:auto;margin:0 0 16px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
table{border-collapse:collapse;width:100%;min-width:520px;font-size:15px;line-height:1.45}
th,td{text-align:left;vertical-align:top;padding:12px 14px;border-bottom:1px solid var(--line)}
th{font:600 13px var(--sans);color:var(--faint)}
tr:last-child td{border-bottom:0}
.eyebrow{display:inline-block;font:600 11px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:14px}
.hero{text-align:center;padding:40px 0 8px}
.hero h1{font-size:clamp(38px,7.5vw,68px);line-height:1.04;letter-spacing:-.035em;margin:8px auto 20px;max-width:12em}
.lede{font-size:clamp(17px,2.2vw,20px);line-height:1.5;color:var(--muted);max-width:30em;margin:0 auto 28px}
.ctas{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:center}
.btn-lg{display:inline-block;padding:14px 24px;border-radius:999px;background:var(--ember);color:var(--on-ember);text-decoration:none;font:600 15px/1 var(--sans)}
.btn-lg:hover{background:var(--ember-hover)}
.soon{display:inline-block;padding:13px 22px;border-radius:999px;border:1px solid var(--line);background:var(--surface);font:600 15px/1 var(--sans);color:var(--text)}
.shots{display:flex;gap:22px;overflow-x:auto;padding:48px 24px 44px;margin:0 -24px -20px;scroll-snap-type:x proximity;justify-content:safe center}
.phone{flex:0 0 auto;width:220px;aspect-ratio:9/19;border-radius:30px;border:1px solid var(--line);background:var(--surface);box-shadow:var(--shadow);overflow:hidden;position:relative;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;text-align:center;padding:18px;font:400 13px/1.35 var(--sans);color:var(--muted)}
.phone img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.rule{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;gap:6px 20px;padding:0;color:var(--faint);font:400 14px var(--sans);margin:44px 0 0}
.feature{display:grid;gap:40px;align-items:center;grid-template-columns:1fr;padding:72px 0 0}
.rule strong{color:var(--text);font-weight:600}
.feature .phone{margin:0 auto;width:min(260px,70vw)}
.feature h3{font-size:clamp(24px,3.6vw,32px);line-height:1.15;letter-spacing:-.025em;margin:0 0 14px}
.feature p{color:var(--muted);max-width:32em}
.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:20px 0 0;list-style:none}
.chips li{margin:0;padding:7px 13px;border-radius:999px;background:var(--soft);font:400 14px/1 var(--sans);color:var(--text)}
@media(min-width:820px){.feature{grid-template-columns:1fr 1fr;gap:96px}.feature .copy{justify-self:end;max-width:32em}.feature.flip .copy{order:2;justify-self:start}}
.values{margin-top:96px;display:grid;gap:16px}
.value{padding:32px;border:1px solid var(--line);border-radius:20px;background:var(--surface);display:grid;gap:12px;align-content:start}
.value h2{margin:0;padding:0;border:0;font-size:clamp(22px,2.6vw,28px);line-height:1.15;letter-spacing:-.025em}
.value p{margin:0;color:var(--muted)}
@media(min-width:900px){.values{grid-template-columns:repeat(3,1fr);gap:20px}}
.closing{text-align:center;padding:88px 0 8px}
.closing h2{border:0;margin:0 auto 16px;padding:0;font-size:clamp(30px,5vw,44px);font-weight:800;line-height:1.08;letter-spacing:-.03em;max-width:12em}
footer{border-top:1px solid var(--line);padding:24px 0 48px;color:var(--faint);font:400 14px var(--sans);display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
footer a,footer em{color:var(--faint)}
[hidden]{display:none!important}
.handoff{padding-bottom:24px}
.handoff .ctas{margin-top:8px}
.fine{color:var(--faint);font-size:14px;line-height:1.5;max-width:30em;margin:22px auto 0}
`;

// Light/dark switch. With no saved choice the site follows the device; the
// first click saves the opposite of what is showing. The head script runs before
// paint so a saved choice never flashes the wrong theme.
const themeInit = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
const themeToggle = `(function(){var b=document.getElementById('theme');if(!b)return;var m=matchMedia('(prefers-color-scheme:dark)');function cur(){return document.documentElement.dataset.theme||(m.matches?'dark':'light')}function sync(){b.setAttribute('aria-label',cur()==='dark'?'Switch to light mode':'Switch to dark mode')}b.addEventListener('click',function(){var n=cur()==='dark'?'light':'dark';document.documentElement.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}sync()});m.addEventListener('change',sync);sync()})()`;
const themeButton = `<button class="theme" id="theme" type="button" aria-label="Switch to dark mode"><svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg><svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>`;

function page({ path, title, description, body, noindex = false }) {
  const nav =
    [
      ['/#features', 'Features'],
      ['/privacy/', 'Privacy'],
      ['/support/', 'Support'],
    ]
      .map(([href, label]) => `<a href="${href}"${href === path ? ' aria-current="page"' : ''}>${label}</a>`)
      .join('') + '<a class="btn" href="/#join">Get the app</a>' + themeButton;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${SITE}${path}">
<link rel="icon" href="/mark.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.png" type="image/png" sizes="64x64">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;600;700;800&display=swap">
<link rel="apple-touch-icon" href="/icon.png">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/icon.png">
<meta name="color-scheme" content="light dark">
<script>${themeInit}</script>
<style>${css}</style>
</head>
<body>
<div class="wrap">
<header class="site">
<a class="brand" href="/"><img src="/mark.svg" alt="" width="34" height="34">mesa</a>
<nav>${nav}</nav>
</header>
<main>
${body}
</main>
<footer>
<span>© ${new Date().getFullYear()} Mesa · find your place at the <em>table</em></span>
<span><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/support/">Support</a> · <a href="mailto:${EMAIL}">${EMAIL}</a></span>
</footer>
</div>
<script>${themeToggle}</script>
</body>
</html>
`;
}

// Phone frames: drop a PNG/JPG named as below into static/shots/ and the
// screen appears. A screen with no screenshot yet is left off the page, and so
// is the feature section that goes with it, rather than showing an empty frame.
const shot = (name, label) => {
  for (const ext of ['png', 'jpg', 'webp']) {
    if (existsSync(join(root, 'static', 'shots', `${name}.${ext}`))) {
      return `<div class="phone"><img src="/shots/${name}.${ext}" alt="${esc(label)} screen in Mesa" loading="lazy"></div>`;
    }
  }
  return '';
};

// Sections alternate sides in the order they end up on the page.
let shown = 0;
const feature = ({ id, eyebrow, title, text, chips, name, label }) => {
  const frame = shot(name, label);
  if (!frame) return '';
  return `
<section class="feature${shown++ % 2 ? ' flip' : ''}" id="${id}">
<div class="copy">
<span class="eyebrow">${eyebrow}</span>
<h3>${title}</h3>
<p>${text}</p>
<ul class="chips">${chips.map((c) => `<li>${c}</li>`).join('')}</ul>
</div>
${frame}
</section>`;
};

const landing = `
<section class="hero">
<h1>Find your place at the <em>table.</em></h1>
<p class="lede">Mesa ranks the food and drink spots near you by how you like to eat, tells you what to order when you get there, and plans a crawl when you can’t pick just one.</p>
<div class="ctas" id="join">
<span class="soon">Coming soon to the App Store</span>
<a class="btn-lg" href="mailto:${EMAIL}?subject=Tell%20me%20when%20Mesa%20launches">Get notified at launch</a>
</div>
</section>

<div class="shots" aria-label="Mesa app screens">
${shot('explore', 'Explore')}
${shot('place', 'Place page')}
${shot('wildcard', 'Wildcard')}
${shot('crawl', 'Crawls')}
${shot('saved', 'Saved')}
</div>

<p class="rule"><strong>Ranked by your</strong><span>Vibe</span><span>Budget</span><span>Cuisines</span><span>Allergies &amp; diet</span><span>Walk or drive</span></p>

<div id="features">
${feature({ id: 'explore', eyebrow: 'Explore', title: 'Spots near you, ranked for <em>you.</em>', text: 'Tell Mesa your vibe, your budget, what you’re always craving and how far you’ll go. Everything nearby gets ranked around that, with a match % on every spot. Big chains stay out unless you search for them by name.', chips: ['Match %', 'Open now', 'Hidden Gem', 'Local Favorite'], name: 'explore', label: 'Explore' })}
${feature({ id: 'order', eyebrow: 'Place pages', title: 'Know what to <em>order.</em>', text: 'Every spot shows the dishes people keep mentioning in reviews, a short read on what they say, and links to anyone who has written about it. Walk in already knowing what to get.', chips: ['Crowd favorites', 'The word on the street', 'As seen in'], name: 'place', label: 'Place page' })}
${feature({ id: 'wildcard', eyebrow: 'Wildcard', title: "Can't decide? <em>Swipe.</em>", text: 'Say what you’re in the mood for and Mesa deals you a hand of spots that are open right now. Swipe right to save, left to pass, and tap a card for the full story.', chips: ['Open now only', 'Undo a swipe', 'Saves to your profile'], name: 'wildcard', label: 'Wildcard' })}
${feature({ id: 'crawls', eyebrow: 'Crawls', title: 'Turn an afternoon into a <em>crawl.</em>', text: 'Coffee, pastries, tacos, ramen, pints or cocktails. Pick a theme and a vibe, and Mesa plans two to four stops in order, on foot or by car, with the route on a map.', chips: ['2 to 4 stops', 'On foot or by car', '“End with dessert”'], name: 'crawl', label: 'Crawls' })}
</div>

<div class="values">
<div class="value"><h2>Picked for how you <em>eat.</em></h2><p>Add your allergies and diet and Mesa steers suggestions away from obvious conflicts. It can’t promise a dish is allergen-free, so always check with the restaurant.</p></div>
<div class="value"><h2>Real places, <em>real</em> sources.</h2><p>Hours and addresses come from Google Maps. Dishes and summaries come from public reviews, and press mentions link to the article. Tap a match % to see why a spot made the list.</p></div>
<div class="value"><h2>AI that you <em>control.</em></h2><p>AI picks help rank spots and plan crawls. They stay off until you say yes, and your name, email and exact location are never sent. Turn them off in Settings and Mesa ranks with its own scoring. <a href="/privacy/#ai-picks">See what’s shared</a>.</p></div>
</div>

<section class="closing">
<h2>Pull up a <em>chair.</em></h2>
<p class="lede">Mesa is opening up to a few people at a time. Send us a note and we’ll tell you when it’s on the App Store.</p>
<div class="ctas">
<span class="soon">Coming soon to the App Store</span>
<a class="btn-lg" href="mailto:${EMAIL}?subject=Tell%20me%20when%20Mesa%20launches">Get notified at launch</a>
</div>
</section>
`;

// --- email link landing pages ---
//
// Confirmation and password-reset emails open in a browser, and Gmail and
// others wrap the link in their own redirect, which can't hand off to a
// custom scheme. So the emails point here, and this page passes the sign-in
// code on to the app with a button (and automatically on a phone). The code
// is single use and only the phone that asked for it can finish the sign-in,
// so the page never handles a session itself.
const APP_LINK_KEYS = ['code', 'error', 'error_code', 'error_description'];

function handoff({ path, title, deepLink, ok, expired }) {
  const script = `(function(){
var q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.slice(1)),out=new URLSearchParams();
${JSON.stringify(APP_LINK_KEYS)}.forEach(function(k){var v=q.get(k)||h.get(k);if(v)out.set(k,v)});
var bad=out.has('error')||out.has('error_description');
var s=out.toString(),link=${JSON.stringify(deepLink)}+(s?'?'+s:'');
document.getElementById('open').href=link;
document.getElementById('ok').hidden=bad;
document.getElementById('bad').hidden=!bad;
if(!bad&&/iPhone|iPad|Android/i.test(navigator.userAgent))setTimeout(function(){location.href=link},400);
})()`;
  const body = `
<section class="hero handoff">
<div id="ok">
<h1>${ok.title}</h1>
<p class="lede">${ok.text}</p>
</div>
<div id="bad" hidden>
<h1>${expired.title}</h1>
<p class="lede">${expired.text}</p>
</div>
<div class="ctas"><a class="btn-lg" id="open" href="${deepLink}">Open Mesa</a></div>
<p class="fine">${ok.fine}</p>
</section>
<script>${script}</script>`;
  return page({
    path,
    title,
    description: 'Open Mesa to finish.',
    noindex: true,
    body,
  });
}

const handoffPages = {
  '/auth/confirm/': handoff({
    path: '/auth/confirm/',
    title: 'Email confirmed · Mesa',
    deepLink: 'mesa://auth/callback',
    ok: {
      title: 'Email <em>confirmed.</em>',
      text: 'Your account is ready. Open Mesa to keep going.',
      fine: 'On a computer? There’s nothing more to do here. Open Mesa on your phone and sign in.',
    },
    expired: {
      title: 'That link has <em>expired.</em>',
      text: 'Confirmation links work once, and they run out after a while. Open Mesa and try signing in. It will offer to send you a new one.',
    },
  }),
  '/auth/reset/': handoff({
    path: '/auth/reset/',
    title: 'Reset your password · Mesa',
    deepLink: 'mesa://reset-password',
    ok: {
      title: 'Choose a new <em>password.</em>',
      text: 'Open Mesa on your phone to set it.',
      fine: 'Opened this on a computer? Open the email again on the phone that has Mesa.',
    },
    expired: {
      title: 'That link has <em>expired.</em>',
      text: 'Reset links work once. In Mesa, tap “Forgot password?” to get a new one.',
    },
  }),
};

// --- build ---

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'static'), out, { recursive: true });

const write = (path, html) => {
  const file = join(out, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};

write('/', page({ path: '/', title: 'Mesa: find your place at the table', description: 'Food and drink spots picked for how you like to eat, and crawls planned around your mood.', body: landing }));

for (const [path, html] of Object.entries(handoffPages)) write(path, html);

let unfilled = 0;
const docs = [
  ['privacy', 'Privacy Policy · Mesa', 'What Mesa collects, why, who it is shared with, and your choices.'],
  ['terms', 'Terms of Service · Mesa', 'The rules for using Mesa, and what Mesa is and isn’t responsible for.'],
  ['support', 'Help & support · Mesa', 'Get help with Mesa, or delete your account.'],
];
const docLinks = { privacy: ['/terms/', 'Terms of Service'], terms: ['/privacy/', 'Privacy Policy'], support: ['/privacy/', 'Privacy Policy'] };

// Marks the section in view in the sidebar.
const tocSpy = `(function(){var l=document.querySelectorAll('.toc a[href^="#"]');if(!l.length||!('IntersectionObserver' in window))return;var m={};l.forEach(function(a){m[a.getAttribute('href').slice(1)]=a});var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;l.forEach(function(a){a.removeAttribute('aria-current')});var a=m[e.target.id];if(a)a.setAttribute('aria-current','true')})},{rootMargin:'0px 0px -70% 0px'});Object.keys(m).forEach(function(id){var h=document.getElementById(id);if(h)io.observe(h)})})()`;

for (const [name, title, description] of docs) {
  const src = readFileSync(join(root, 'content', `${name}.md`), 'utf8');
  for (const p of placeholders(src)) {
    unfilled++;
    console.warn(`content/${name}.md: fill in [${p}]`);
  }
  const { html, toc } = markdown(src);
  const [altHref, altLabel] = docLinks[name];
  const aside = `<aside class="toc" aria-label="On this page"><p>On this page</p><ol>${toc.map(([id, label]) => `<li><a href="#${id}">${label}</a></li>`).join('')}</ol><div class="alt">See also: <a href="${altHref}">${altLabel}</a></div></aside>`;
  write(`/${name}/`, page({ path: `/${name}/`, title, description, body: `<div class="docs">${aside}<article class="doc">${html}<a class="back" href="/">← Back to home</a></article></div><script>${tocSpy}</script>` }));
}

// GitHub Pages: custom domain, and a 404 that sends people home.
writeFileSync(join(out, 'CNAME'), 'mesamesa.app\n');
writeFileSync(join(out, '.nojekyll'), '');
writeFileSync(
  join(out, '404.html'),
  page({ path: '/404', title: 'Not found · Mesa', description: 'Page not found.', noindex: true, body: '<section class="hero"><h1>Nothing at this <em>table.</em></h1><p class="lede">That page doesn’t exist. <a href="/">Head back home</a>.</p></section>' }),
);

if (unfilled && strict) {
  console.error(`\n${unfilled} placeholder(s) left. Not publishing a policy with blanks in it.`);
  process.exit(1);
}
console.log(`Built ${out}${unfilled ? ` (${unfilled} placeholder(s) still to fill in)` : ''}`);
