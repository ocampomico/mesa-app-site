// Builds the mesamesa.app site into ./dist. No dependencies: node build.mjs
//
//   node build.mjs            build; warn about unfilled [placeholders]
//   node build.mjs --strict   same, but fail if any remain (used by the deploy)
//
// Pages: / (landing), /privacy/ and /support/ (from content/*.md).
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
  let i = 0;
  const isBlank = (l) => l === undefined || l.trim() === '';
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
    } else if (/^#{1,3} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      const text = line.slice(level + 1).trim();
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
  return html.join('\n');
}

/** [Text in brackets] that isn't a link: something still to fill in. */
const placeholders = (src) => [...src.matchAll(/\[([^\]]+)\](?!\()/g)].map((m) => m[1]);

// --- layout ---

const css = `
:root{--bg:#FAF7F2;--surface:#FFFFFF;--soft:#F1ECE4;--text:#16130F;--muted:rgba(22,19,15,.66);--line:rgba(22,19,15,.11);--ember:#B84C24;--ember-wash:rgba(184,76,36,.1);--link:#B84C24;--serif:Newsreader,Georgia,Cambria,"Times New Roman",serif;--sans:Figtree,-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font:400 18px/1.6 var(--serif)}
a{color:var(--link);text-underline-offset:3px}
em{font-style:italic;color:var(--ember)}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.doc{max-width:720px}
header.site{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.brand{display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font:800 24px/1 var(--sans);letter-spacing:-.02em}
.brand img{width:34px;height:34px}
nav{display:flex;align-items:center;gap:22px;font:500 15px/1 var(--sans)}
nav a{color:var(--muted);text-decoration:none}
nav a:hover,nav a[aria-current]{color:var(--text)}
nav a.btn{color:#fff;background:var(--ember);padding:10px 16px;border-radius:999px}
nav a.btn:hover{background:#9c3f1c;color:#fff}
@media(max-width:620px){nav a.hide-sm{display:none}}
main{padding:24px 0 72px}
h1,h2,h3{font-family:var(--serif);font-weight:400;letter-spacing:-.015em;text-wrap:balance}
h1{font-size:clamp(34px,6vw,48px);line-height:1.1;margin:8px 0 18px}
h2{font-size:26px;line-height:1.2;margin:48px 0 10px;padding-top:28px;border-top:1px solid var(--line);scroll-margin-top:16px}
.doc h2:first-of-type{border-top:0;padding-top:0}
h3{font-size:19px;margin:26px 0 4px}
p,ul{margin:0 0 16px}
ul{padding-left:22px}
li{margin-bottom:8px}
strong{font-weight:500;background:linear-gradient(transparent 62%,var(--ember-wash) 0)}
.back{display:inline-block;margin-top:40px;font:500 15px var(--sans);text-decoration:none}
.table{overflow-x:auto;margin:0 0 16px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
table{border-collapse:collapse;width:100%;min-width:520px;font-size:16px;line-height:1.45}
th,td{text-align:left;vertical-align:top;padding:12px 14px;border-bottom:1px solid var(--line)}
th{font:500 14px var(--sans);color:var(--muted)}
tr:last-child td{border-bottom:0}
.eyebrow{display:inline-block;font:600 12px/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--ember);margin-bottom:14px}
.pill{display:inline-flex;align-items:center;gap:10px;padding:6px 14px 6px 6px;border:1px solid var(--line);border-radius:999px;background:var(--surface);font:500 14px/1 var(--sans);color:var(--muted)}
.pill img{width:26px;height:26px;border-radius:50%}
.pill b{color:var(--ember);font-weight:600}
.hero{text-align:center;padding:40px 0 8px}
.hero h1{font-size:clamp(42px,9vw,84px);line-height:1.02;margin:22px auto 20px;max-width:12em}
.lede{font-size:clamp(19px,2.6vw,22px);line-height:1.5;color:var(--muted);max-width:30em;margin:0 auto 28px}
.ctas{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:center}
.btn-lg{display:inline-block;padding:14px 24px;border-radius:999px;background:var(--ember);color:#fff;text-decoration:none;font:600 16px/1 var(--sans)}
.btn-lg:hover{background:#9c3f1c}
.soon{display:inline-block;padding:13px 22px;border-radius:999px;border:1px solid var(--line);background:var(--surface);font:500 15px/1 var(--sans);color:var(--text)}
.shots{display:flex;gap:18px;overflow-x:auto;padding:48px 24px 44px;margin:0 -24px -20px;scroll-snap-type:x proximity;justify-content:safe center}
.phone{flex:0 0 auto;width:200px;aspect-ratio:9/19;border-radius:30px;border:1px solid var(--line);background:linear-gradient(160deg,var(--surface),var(--soft));box-shadow:0 18px 40px -22px rgba(22,19,15,.35);overflow:hidden;position:relative;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;text-align:center;padding:18px;font:500 13px/1.35 var(--sans);color:var(--muted)}
.phone span{display:block}
.phone span b{display:block;color:var(--ember);font:600 15px var(--sans);margin-bottom:4px}
.phone img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.rule{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 20px;padding:0;color:var(--muted);font:500 14px var(--sans);margin:44px 0 0}
.feature{display:grid;gap:40px;align-items:center;grid-template-columns:1fr;padding:72px 0 0}
.feature .phone{margin:0 auto;width:min(240px,70vw)}
.feature h3{font-size:clamp(28px,4.6vw,40px);line-height:1.12;margin:0 0 14px}
.feature p{color:var(--muted);max-width:30em}
.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:20px 0 0;list-style:none}
.chips li{margin:0;padding:7px 13px;border-radius:999px;background:var(--soft);font:500 14px/1 var(--sans);color:var(--text)}
@media(min-width:820px){.feature{grid-template-columns:1fr 1fr;gap:72px}.feature.flip .copy{order:2}}
.values{margin-top:88px;border-top:1px solid var(--line)}
.value{padding:44px 0;border-bottom:1px solid var(--line);display:grid;gap:12px}
.value h2{margin:0;padding:0;border:0;font-size:clamp(28px,4.6vw,40px);line-height:1.12}
.value p{margin:0;color:var(--muted);max-width:34em}
@media(min-width:820px){.value{grid-template-columns:1fr 1fr;gap:72px;align-items:baseline}}
.closing{text-align:center;padding:88px 0 8px}
.closing h2{border:0;margin:0 auto 24px;padding:0;font-size:clamp(34px,6vw,56px);line-height:1.08;max-width:12em}
footer{border-top:1px solid var(--line);padding:24px 0 48px;color:var(--muted);font:400 14px var(--sans);display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
footer a{color:var(--muted)}
`;

function page({ path, title, description, body, doc = false }) {
  const nav =
    [
      ['/#features', 'Features', 'hide-sm'],
      ['/privacy/', 'Privacy', 'hide-sm'],
      ['/support/', 'Support', ''],
    ]
      .map(([href, label, cls]) => `<a href="${href}"${cls ? ` class="${cls}"` : ''}${href === path ? ' aria-current="page"' : ''}>${label}</a>`)
      .join('') + '<a class="btn" href="/#join">Get the app</a>';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&display=swap">
<link rel="apple-touch-icon" href="/icon.png">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/icon.png">
<meta name="color-scheme" content="light">
<style>${css}</style>
</head>
<body>
<div class="wrap${doc ? ' doc' : ''}">
<header class="site">
<a class="brand" href="/"><img src="/mark.svg" alt="" width="34" height="34">mesa.</a>
<nav>${nav}</nav>
</header>
<main>
${body}
</main>
<footer>
<span>© ${new Date().getFullYear()} Mesa · find your place at the <em>table</em></span>
<span><a href="/privacy/">Privacy</a> · <a href="/support/">Support</a> · <a href="mailto:${EMAIL}">${EMAIL}</a></span>
</footer>
</div>
</body>
</html>
`;
}

// Phone frames: drop a PNG/JPG named as below into static/shots/ and it replaces the placeholder.
const shot = (name, label, note) => {
  for (const ext of ['png', 'jpg', 'webp']) {
    if (existsSync(join(root, 'static', 'shots', `${name}.${ext}`))) {
      return `<div class="phone"><img src="/shots/${name}.${ext}" alt="${esc(label)} screen in Mesa" loading="lazy"></div>`;
    }
  }
  return `<div class="phone" role="img" aria-label="${esc(label)} screen, screenshot coming soon"><span><b>${esc(label)}</b>${esc(note)}</span></div>`;
};

const feature = ({ id, flip, eyebrow, title, text, chips, name, label, note }) => `
<section class="feature${flip ? ' flip' : ''}" id="${id}">
<div class="copy">
<span class="eyebrow">${eyebrow}</span>
<h3>${title}</h3>
<p>${text}</p>
<ul class="chips">${chips.map((c) => `<li>${c}</li>`).join('')}</ul>
</div>
${shot(name, label, note)}
</section>`;

const landing = `
<section class="hero">
<span class="pill"><img src="/icon.png" alt="" width="26" height="26"><span><b>New</b> · AI picks that know your taste</span></span>
<h1>Find your place at the <em>table.</em></h1>
<p class="lede">Mesa finds the food and drink spots worth your time, picked for how you like to eat, and turns any afternoon into a crawl.</p>
<div class="ctas" id="join">
<span class="soon">Coming soon to the App Store</span>
<a class="btn-lg" href="mailto:${EMAIL}?subject=Tell%20me%20when%20Mesa%20launches">Get notified at launch</a>
</div>
</section>

<div class="shots" aria-label="Mesa app screens">
${shot('explore', 'Explore', 'Spots near you, ranked for you')}
${shot('place', 'Place page', 'What to order and who featured it')}
${shot('wildcard', 'Wildcard', 'Swipe to save or pass')}
${shot('crawl', 'Crawls', 'Stops planned by theme and vibe')}
${shot('saved', 'Saved', 'Your shortlist, in one place')}
</div>

<p class="rule"><span>Vibe</span><span>Budget</span><span>Cuisines</span><span>Allergies &amp; diet</span><span>Walk or drive</span></p>

<div id="features">
${feature({ id: 'explore', eyebrow: 'Explore', title: 'Spots near you, ranked for <em>you.</em>', text: 'Set your vibe, budget, cuisines and how far you will walk or drive. Mesa ranks what is nearby around all of it, and updates the moment you change your mind.', chips: ['Vibe', 'Budget', 'Cuisines', 'Walk or drive'], name: 'explore', label: 'Explore', note: 'Spots near you, ranked for you' })}
${feature({ id: 'order', flip: true, eyebrow: 'Place pages', title: 'Know what to <em>order.</em>', text: 'Open a spot and see what to try, what people say, and where it has been featured, before you walk in.', chips: ['What to try', 'What people say', 'As seen in'], name: 'place', label: 'Place page', note: 'What to order and who featured it' })}
${feature({ id: 'wildcard', eyebrow: 'Wildcard', title: "Can't decide? <em>Swipe.</em>", text: 'A deck of great open spots, one at a time. Swipe right to save one, left to pass.', chips: ['Open now', 'Swipe right to save', 'Left to pass'], name: 'wildcard', label: 'Wildcard', note: 'Swipe to save or pass' })}
${feature({ id: 'crawls', flip: true, eyebrow: 'Crawls', title: 'Turn an afternoon into a <em>crawl.</em>', text: 'Pick a theme and a vibe, and Mesa plans the stops, on foot or by car.', chips: ['Pick a theme', 'Pick a vibe', 'On foot or by car'], name: 'crawl', label: 'Crawls', note: 'Stops planned by theme and vibe' })}
</div>

<div class="values">
<div class="value"><h2>Picked for how you <em>eat.</em></h2><p>Tell Mesa your allergies and diet and it steers suggestions away from obvious conflicts. It cannot guarantee any dish is allergen-free, so always confirm with the restaurant.</p></div>
<div class="value"><h2>Real places, <em>real</em> sources.</h2><p>Place details come from Google Maps, and Mesa shows where a spot has been featured, so you can see why it made the list.</p></div>
<div class="value"><h2>AI that you <em>control.</em></h2><p>AI picks help rank spots and plan crawls. Turn them off anytime in Settings, and Mesa ranks with its own scoring and sends nothing to the AI provider.</p></div>
</div>

<section class="closing">
<h2>Find your place at the <em>table.</em></h2>
<div class="ctas">
<span class="soon">Coming soon to the App Store</span>
<a class="btn-lg" href="mailto:${EMAIL}?subject=Tell%20me%20when%20Mesa%20launches">Get notified at launch</a>
</div>
</section>
`;

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

let unfilled = 0;
for (const [name, title, description] of [
  ['privacy', 'Privacy Policy · Mesa', 'What Mesa collects, why, who it is shared with, and your choices.'],
  ['support', 'Help & support · Mesa', 'Get help with Mesa, or delete your account.'],
]) {
  const src = readFileSync(join(root, 'content', `${name}.md`), 'utf8');
  for (const p of placeholders(src)) {
    unfilled++;
    console.warn(`content/${name}.md: fill in [${p}]`);
  }
  write(`/${name}/`, page({ path: `/${name}/`, title, description, doc: true, body: markdown(src) + '<a class="back" href="/">← Back to home</a>' }));
}

// GitHub Pages: custom domain, and a 404 that sends people home.
writeFileSync(join(out, 'CNAME'), 'mesamesa.app\n');
writeFileSync(join(out, '.nojekyll'), '');
writeFileSync(
  join(out, '404.html'),
  page({ path: '/404', title: 'Not found · Mesa', description: 'Page not found.', doc: true, body: '<h1>Nothing at this <em>table.</em></h1><p class="lede">That page doesn\'t exist. <a href="/">Head back home</a>.</p>' }),
);

if (unfilled && strict) {
  console.error(`\n${unfilled} placeholder(s) left. Not publishing a policy with blanks in it.`);
  process.exit(1);
}
console.log(`Built ${out}${unfilled ? ` (${unfilled} placeholder(s) still to fill in)` : ''}`);
