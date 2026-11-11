// Builds the mesamesa.app site into ./dist. No dependencies: node build.mjs
//
//   node build.mjs            build; warn about unfilled [placeholders]
//   node build.mjs --strict   same, but fail if any remain (used by the deploy)
//
// Pages: / (landing), /privacy/ and /support/ (from content/*.md).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
:root{--bg:#FAFAFA;--surface:#FFFFFF;--text:#111111;--muted:rgba(17,17,17,.66);--line:rgba(17,17,17,.12);--ember:#B84C24;--link:#B84C24}
@media (prefers-color-scheme:dark){:root{--bg:#111111;--surface:#1A1A1A;--text:#FAFAFA;--muted:rgba(250,250,250,.7);--line:rgba(250,250,250,.16);--link:#F0A98A}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:400 17px/1.6 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif}
a{color:var(--link);text-underline-offset:3px}
.wrap{max-width:720px;margin:0 auto;padding:0 20px}
header.site{display:flex;align-items:center;justify-content:space-between;padding:20px 0}
.brand{display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-size:22px;font-weight:300;letter-spacing:.01em}
.brand img{width:36px;height:36px}
nav a{margin-left:20px;color:var(--muted);text-decoration:none;font-size:15px}
nav a:hover,nav a[aria-current]{color:var(--text)}
main{padding:32px 0 64px}
h1{font-weight:300;font-size:clamp(32px,6vw,44px);line-height:1.15;margin:0 0 16px;text-wrap:balance}
h2{font-weight:400;font-size:22px;margin:44px 0 8px;scroll-margin-top:16px}
h3{font-weight:400;font-size:17px;margin:28px 0 4px}
p,ul{margin:0 0 16px}
ul{padding-left:22px}
li{margin-bottom:8px}
strong{font-weight:400;color:var(--text);background:linear-gradient(transparent 62%,rgba(184,76,36,.18) 0)}
.table{overflow-x:auto;margin:0 0 16px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
table{border-collapse:collapse;width:100%;min-width:520px;font-size:15px;line-height:1.45}
th,td{text-align:left;vertical-align:top;padding:12px 14px;border-bottom:1px solid var(--line)}
th{font-weight:400;color:var(--muted)}
tr:last-child td{border-bottom:0}
.lede{font-size:20px;line-height:1.5;color:var(--muted);font-weight:300;max-width:34em}
.features{list-style:none;padding:0;margin:40px 0 0;display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.features li{margin:0;padding:18px 20px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.features b{display:block;font-weight:400;color:var(--ember)}
@media (prefers-color-scheme:dark){.features b{color:#F0A98A}}
.features span{color:var(--muted);font-size:15px;line-height:1.5;display:block;margin-top:4px}
.soon{display:inline-block;margin-top:28px;padding:10px 18px;border-radius:999px;background:var(--ember);color:#FAFAFA;font-size:15px}
footer{border-top:1px solid var(--line);padding:24px 0 48px;color:var(--muted);font-size:14px;display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
footer a{color:var(--muted)}
`;

function page({ path, title, description, body }) {
  const nav = [
    ['/privacy/', 'Privacy'],
    ['/support/', 'Support'],
  ]
    .map(([href, label]) => `<a href="${href}"${href === path ? ' aria-current="page"' : ''}>${label}</a>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="icon" href="/favicon.png">
<link rel="apple-touch-icon" href="/icon.png">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/icon.png">
<meta name="color-scheme" content="light dark">
<style>${css}</style>
</head>
<body>
<div class="wrap">
<header class="site">
<a class="brand" href="/"><img src="/mark.svg" alt="" width="36" height="36">mesa</a>
<nav>${nav}</nav>
</header>
<main>
${body}
</main>
<footer>
<span>© ${new Date().getFullYear()} Mesa · find your place at the table</span>
<span><a href="/privacy/">Privacy</a> · <a href="/support/">Support</a> · <a href="mailto:${EMAIL}">${EMAIL}</a></span>
</footer>
</div>
</body>
</html>
`;
}

const landing = `
<h1>Find your place at the table.</h1>
<p class="lede">Mesa finds the food and drink spots worth your time, picked for how you like to eat, and turns any afternoon into a crawl.</p>
<span class="soon">Coming soon to the App Store</span>
<ul class="features">
<li><b>Explore</b><span>Spots near you, ranked by your vibe, budget, cuisines and how far you'll walk or drive.</span></li>
<li><b>Know what to order</b><span>What to try, what people say, and where a place has been featured.</span></li>
<li><b>Wildcard</b><span>Can't decide? Swipe a deck of great open spots. Right to save, left to pass.</span></li>
<li><b>Crawls</b><span>Pick a theme and a vibe, and Mesa plans the stops, on foot or by car.</span></li>
</ul>
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
  write(`/${name}/`, page({ path: `/${name}/`, title, description, body: markdown(src) }));
}

// GitHub Pages: custom domain, and a 404 that sends people home.
writeFileSync(join(out, 'CNAME'), 'mesamesa.app\n');
writeFileSync(join(out, '.nojekyll'), '');
writeFileSync(
  join(out, '404.html'),
  page({ path: '/404', title: 'Not found · Mesa', description: 'Page not found.', body: '<h1>Nothing at this table.</h1><p class="lede">That page doesn\'t exist. <a href="/">Head back home</a>.</p>' }),
);

if (unfilled && strict) {
  console.error(`\n${unfilled} placeholder(s) left. Not publishing a policy with blanks in it.`);
  process.exit(1);
}
console.log(`Built ${out}${unfilled ? ` (${unfilled} placeholder(s) still to fill in)` : ''}`);
