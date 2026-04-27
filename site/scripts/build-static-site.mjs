#!/usr/bin/env node
/**
 * Build the static JSON-LD publication for taxonomy.mapko.net.
 *
 * Designed to live INSIDE the public es-ua/nace-osm-taxonomy repo at
 * `site/`. Reads the source taxonomy from the sibling `categories/`
 * directory directly — no npm round-trip needed. So a fresh edit to a
 * category JSON triggers a fresh deploy via the same workflow the npm
 * publish uses.
 *
 * Resolution order for the taxonomy source root:
 *   1. `TAXONOMY_ROOT` env var (explicit override — useful for CI smoke
 *      tests or when running from a checkout in another location).
 *   2. `<scriptDir>/../..` — public-repo layout: site/ is one level
 *      under repo root, categories/ is the sibling.
 *   3. `<scriptDir>/..` — flat layout (some monorepo setups).
 *   4. `require.resolve('@mapko/nace-osm-taxonomy/taxonomy.jsonld')` —
 *      npm package fallback (when this script is run from outside the
 *      repo, e.g. someone scaffolding their own viewer).
 *
 * Output layout:
 *   dist/index.html                    browsable landing + search (Phase 3)
 *   dist/v1/index.jsonld               whole taxonomy
 *   dist/v1/context.jsonld             @context file
 *   dist/v1/category/<slug>.jsonld     one per category
 *   dist/v1/subcategory/<slug>.jsonld  one per subcategory
 *   dist/v1/template/<slug>.jsonld     one per template
 *   dist/sitemap.xml                   crawler sitemap (root — standard location)
 *   dist/v1/sitemap.xml                same sitemap mirrored under /v1 (back-compat)
 *   dist/robots.txt                    points crawlers at /sitemap.xml
 *   dist/v1/index.html                 redirect to /
 *   dist/_headers                      Cloudflare Pages response headers
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const BASE_URL = 'https://taxonomy.mapko.net';
const V1 = `${BASE_URL}/v1`;
const CONTEXT_URL = `${V1}/context.jsonld`;
const SCHEME_URI = `${V1}/`;

const outRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const outV1 = join(outRoot, 'v1');

function locateTaxonomyRoot() {
  // 1. explicit override
  if (process.env.TAXONOMY_ROOT && existsSync(process.env.TAXONOMY_ROOT)) {
    return process.env.TAXONOMY_ROOT;
  }
  // 2. public-repo layout: site/ is one level under root
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(scriptDir, '..', '..'),
    join(scriptDir, '..'),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, 'categories')) && existsSync(join(c, 'context.jsonld'))) {
      return c;
    }
  }
  // 3. installed npm package
  try {
    const jsonld = require.resolve('@mapko/nace-osm-taxonomy/taxonomy.jsonld');
    return dirname(jsonld);
  } catch {
    /* fall through */
  }
  throw new Error(
    'Could not locate taxonomy source. Expected sibling `categories/` dir or installed @mapko/nace-osm-taxonomy package.',
  );
}

function loadSource() {
  const root = locateTaxonomyRoot();
  const categoriesDir = join(root, 'categories');
  const contextFile = join(root, 'context.jsonld');
  const versionFile = join(root, 'VERSION');
  if (!existsSync(categoriesDir)) throw new Error(`categories dir not found: ${categoriesDir}`);

  const version = existsSync(versionFile)
    ? readFileSync(versionFile, 'utf8').trim()
    : 'unknown';
  const context = JSON.parse(readFileSync(contextFile, 'utf8'));
  const categoryFiles = readdirSync(categoriesDir).filter((f) => f.endsWith('.json')).sort();
  const categories = categoryFiles.map((f) =>
    JSON.parse(readFileSync(join(categoriesDir, f), 'utf8')),
  );
  console.log(`Loading taxonomy v${version} from ${root}`);
  return { version, context, categories };
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function writeJsonld(path, payload) {
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n');
}

function nodeEnvelope(node, type) {
  // node already has @id / skos:Concept shape from the source JSON.
  // We just enrich it with @context + inScheme for Linked-Data navigability.
  const clone = { ...node };
  delete clone['@context'];
  return {
    '@context': CONTEXT_URL,
    '@id': node['@id'],
    '@type': type,
    'skos:inScheme': { '@id': SCHEME_URI },
    ...clone,
  };
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateLandingPage({ version, categories, categoryCount, subcategoryCount, templateCount }) {
  // Compact search index — English names + slugs only
  const idx = [];
  for (const cat of categories) {
    idx.push({ t: 'c', n: cat.names.en, s: cat.slug });
    for (const sub of cat.subcategories ?? []) {
      idx.push({ t: 's', n: sub.names.en, s: sub.slug, p: cat.names.en });
      for (const tpl of sub.templates ?? []) {
        idx.push({ t: 'tpl', n: tpl.names.en, s: tpl.slug, p: sub.names.en });
      }
    }
  }
  // Escape </script> inside JSON to prevent premature tag close
  const idxJson = JSON.stringify(idx).replace(/<\//g, '<\\/');

  // Category accordion HTML (details/summary — works without JS)
  const catsHtml = categories.map((cat) => {
    const subCount = (cat.subcategories ?? []).length;
    const tplCount = (cat.subcategories ?? []).reduce((n, s) => n + (s.templates ?? []).length, 0);
    const subsHtml = (cat.subcategories ?? []).map((sub) => {
      const tplsHtml = (sub.templates ?? [])
        .map((tpl) => `<a class="tpl" href="/v1/template/${tpl.slug}.jsonld">${esc(tpl.names.en)}</a>`)
        .join('');
      return (
        `<div class="sub">` +
        `<div class="sub-hdr"><span class="sub-name">${esc(sub.names.en)}</span>` +
        `<span class="sub-cnt">${(sub.templates ?? []).length}</span></div>` +
        `<div class="tpls">${tplsHtml}</div>` +
        `</div>`
      );
    }).join('');
    return (
      `<details class="cat">\n` +
      `<summary class="cat-hdr">` +
      `<span class="cat-icon">${esc(cat.icon ?? '')}</span>` +
      `<div class="cat-info"><span class="cat-name">${esc(cat.names.en)}</span>` +
      `<span class="cat-meta">${esc(cat.naceRef)} &middot; ${subCount} subcategories &middot; ${tplCount} templates</span></div>` +
      `<span class="cat-arrow">›</span>` +
      `</summary>\n` +
      `<div class="cat-body">${subsHtml}</div>\n` +
      `</details>`
    );
  }).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NACE-OSM Taxonomy — Open Multilingual SMB Classification</title>
<meta name="description" content="Open multilingual (EN/UK/DE/RU) SMB service taxonomy — ${categoryCount} categories, ${subcategoryCount} subcategories, ${templateCount} templates. JSON-LD, npm package, REST API.">
<style>
:root{--blue:#2563EB;--blue-lt:#EFF6FF;--g9:#111827;--g7:#374151;--g5:#6B7280;--g3:#D1D5DB;--g1:#F9FAFB;--r:8px}
*{box-sizing:border-box;margin:0;padding:0}
body{font:16px/1.6 system-ui,sans-serif;color:var(--g9);background:#fff}
a{color:var(--blue);text-decoration:none}
code{font-family:ui-monospace,monospace;font-size:.88em;background:var(--g1);padding:.1em .35em;border-radius:4px;border:1px solid var(--g3)}
nav{display:flex;align-items:center;justify-content:space-between;padding:.75rem 2rem;border-bottom:1px solid var(--g3);position:sticky;top:0;background:#fff;z-index:10}
.logo{font-weight:700;font-size:1.05rem;color:var(--g9)}
.logo em{font-style:normal;color:var(--blue)}
.nav-links{display:flex;gap:1.5rem;font-size:.875rem}
.nav-links a{color:var(--g5);transition:color .15s}
.nav-links a:hover{color:var(--blue)}
.hero{text-align:center;padding:5rem 1.5rem 3.5rem;max-width:760px;margin:0 auto}
h1{font-size:2.75rem;font-weight:800;letter-spacing:-.025em;line-height:1.15;margin-bottom:1rem}
h1 em{font-style:normal;color:var(--blue)}
.hero-sub{font-size:1.1rem;color:var(--g5);max-width:520px;margin:0 auto 2.5rem;line-height:1.6}
.stats{display:flex;gap:2.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:2.5rem}
.stat-n{font-size:2.5rem;font-weight:800;color:var(--blue);line-height:1}
.stat-l{font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:var(--g5);margin-top:.25rem}
.ctas{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
.btn{padding:.6rem 1.4rem;border-radius:var(--r);font-size:.9rem;font-weight:500;transition:opacity .15s;display:inline-block}
.btn:hover{opacity:.8}
.btn-blue{background:var(--blue);color:#fff}
.btn-out{border:1.5px solid var(--g3);color:var(--g7)}
.section{max-width:900px;margin:0 auto;padding:4rem 1.5rem}
.section h2{font-size:1.4rem;font-weight:700;margin-bottom:1.5rem}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:1.125rem}
.card{padding:1.25rem;border:1px solid var(--g3);border-radius:var(--r)}
.card h3{font-size:.9rem;font-weight:600;margin-bottom:.4rem}
.card p{font-size:.85rem;color:var(--g5);line-height:1.55}
.search-wrap{position:relative;margin-bottom:1.25rem}
.search-wrap svg{position:absolute;left:.875rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--g5)}
#q{width:100%;padding:.75rem 1rem .75rem 2.75rem;font-size:1rem;border:1.5px solid var(--g3);border-radius:var(--r);outline:none;transition:border-color .15s}
#q:focus{border-color:var(--blue)}
#results{display:none;border:1px solid var(--g3);border-radius:var(--r);overflow:hidden;margin-bottom:1rem}
.ri{display:flex;align-items:center;gap:.625rem;padding:.625rem .875rem;text-decoration:none;color:var(--g9);border-bottom:1px solid var(--g3);transition:background .1s}
.ri:last-child{border-bottom:none}
.ri:hover{background:var(--g1)}
.ri-name{flex:1;font-size:.9rem}
.ri-par{font-size:.76rem;color:var(--g5)}
.badge{font-size:.68rem;padding:.15rem .45rem;border-radius:4px;font-weight:600;white-space:nowrap}
.bc{background:#DBEAFE;color:#1E40AF}
.bs{background:#D1FAE5;color:#065F46}
.bt{background:var(--g1);color:var(--g5);border:1px solid var(--g3)}
details.cat{border:1px solid var(--g3);border-radius:var(--r);margin-bottom:.5rem}
summary.cat-hdr{display:flex;align-items:center;gap:.875rem;padding:.875rem 1rem;cursor:pointer;list-style:none;-webkit-appearance:none;user-select:none;transition:background .1s}
summary.cat-hdr::-webkit-details-marker{display:none}
summary.cat-hdr:hover{background:var(--g1)}
.cat-icon{font-size:1.35rem;flex-shrink:0;width:1.75rem;text-align:center}
.cat-info{flex:1;min-width:0}
.cat-name{font-weight:600;display:block;font-size:.975rem}
.cat-meta{font-size:.76rem;color:var(--g5)}
.cat-arrow{color:var(--g5);font-size:1.1rem;transition:transform .2s;flex-shrink:0}
details[open]>.cat-hdr .cat-arrow{transform:rotate(90deg)}
.cat-body{padding:.875rem 1.25rem 1.25rem 1.25rem;border-top:1px solid var(--g3)}
.sub{margin-bottom:.875rem}
.sub:last-child{margin-bottom:0}
.sub-hdr{display:flex;align-items:baseline;gap:.5rem;margin-bottom:.375rem}
.sub-name{font-weight:500;font-size:.9rem}
.sub-cnt{font-size:.7rem;color:var(--g5);background:var(--g1);padding:.1rem .4rem;border-radius:999px;border:1px solid var(--g3)}
.tpls{display:flex;flex-wrap:wrap;gap:.3rem}
.tpl{font-size:.76rem;padding:.2rem .55rem;border-radius:4px;background:var(--g1);color:var(--g5);border:1px solid var(--g3);transition:all .1s}
.tpl:hover{background:var(--blue-lt);color:var(--blue);border-color:#BFDBFE}
.use-wrap{background:var(--g1);padding:4rem 1.5rem;border-top:1px solid var(--g3)}
.use-inner{max-width:900px;margin:0 auto}
.use-inner h2{font-size:1.4rem;font-weight:700;margin-bottom:1.5rem}
.use-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:1.25rem}
.use-card{background:#fff;border:1px solid var(--g3);border-radius:var(--r);padding:1.25rem}
.use-card h3{font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:var(--g5);margin-bottom:.75rem}
pre{background:#1E293B;color:#E2E8F0;padding:1rem;border-radius:var(--r);font-size:.78rem;overflow-x:auto;line-height:1.6;tab-size:2}
footer{text-align:center;padding:2.5rem 1rem;font-size:.85rem;color:var(--g5);border-top:1px solid var(--g3)}
footer a{color:var(--g5)}
footer a:hover{color:var(--blue)}
@media(max-width:640px){
  h1{font-size:2rem}
  .stat-n{font-size:2rem}
  .nav-links{gap:.875rem;font-size:.8rem}
  nav{padding:.75rem 1rem}
  .section{padding:3rem 1rem}
}
</style>
</head>
<body>

<nav>
  <a class="logo" href="/"><em>NACE-OSM</em> Taxonomy</a>
  <div class="nav-links">
    <a href="/v1/index.jsonld">JSON-LD</a>
    <a href="/sitemap.xml">Sitemap</a>
    <a href="https://github.com/es-ua/nace-osm-taxonomy">GitHub</a>
    <a href="https://www.npmjs.com/package/@mapko/nace-osm-taxonomy">npm</a>
  </div>
</nav>

<div class="hero">
  <h1>Open <em>multilingual</em><br>SMB taxonomy</h1>
  <p class="hero-sub">Maps NACE Rev.2 industry codes to OSM tags with 4-language service templates — for local directories, marketplaces, and knowledge graphs.</p>
  <div class="stats">
    <div class="stat"><div class="stat-n">${categoryCount}</div><div class="stat-l">Categories</div></div>
    <div class="stat"><div class="stat-n">${subcategoryCount}</div><div class="stat-l">Subcategories</div></div>
    <div class="stat"><div class="stat-n">${templateCount}</div><div class="stat-l">Templates</div></div>
    <div class="stat"><div class="stat-n">4</div><div class="stat-l">Languages</div></div>
  </div>
  <div class="ctas">
    <a class="btn btn-blue" href="https://github.com/es-ua/nace-osm-taxonomy">View on GitHub</a>
    <a class="btn btn-out" href="https://www.npmjs.com/package/@mapko/nace-osm-taxonomy">npm package</a>
    <a class="btn btn-out" href="/v1/index.jsonld">Full JSON-LD</a>
  </div>
</div>

<div class="section">
  <h2>What is it?</h2>
  <div class="cards">
    <div class="card">
      <h3>Standards-based</h3>
      <p>Rooted in NACE Rev.2 (EU statistical classification) and OpenStreetMap community tags. Every node carries a Schema.org type and Wikidata QID.</p>
    </div>
    <div class="card">
      <h3>Linked Data ready</h3>
      <p>Every category, subcategory, and template has a stable <code>@id</code> URI that resolves to its JSON-LD document on this site.</p>
    </div>
    <div class="card">
      <h3>Multilingual</h3>
      <p>All ${templateCount} templates translated into English, Ukrainian, German, and Russian — with linguistic hints for NLP pipelines.</p>
    </div>
    <div class="card">
      <h3>MIT licensed</h3>
      <p>Free for commercial and open-source use. Built by <a href="https://mapko.net">Mapko</a> as the upper ontology for its business knowledge graph.</p>
    </div>
  </div>
</div>

<div class="section">
  <h2>Browse</h2>
  <div class="search-wrap">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input id="q" type="search" placeholder="Search ${templateCount} templates…" autocomplete="off" spellcheck="false">
  </div>
  <div id="results"></div>
  <div id="cats">
${catsHtml}
  </div>
</div>

<div class="use-wrap">
  <div class="use-inner">
    <h2>Use it</h2>
    <div class="use-grid">
      <div class="use-card">
        <h3>npm</h3>
        <pre>npm i @mapko/nace-osm-taxonomy

import tax from
  '@mapko/nace-osm-taxonomy'

// tax.categories[0]
//   .subcategories[0]
//   .templates[0].names.en</pre>
      </div>
      <div class="use-card">
        <h3>REST / JSON-LD</h3>
        <pre>GET /v1/template/womens-haircut.jsonld

{
  "@id": "https://taxonomy.mapko.net
    /v1/template/womens-haircut",
  "@type": "skos:Concept",
  "names": {
    "en": "Women's Haircut",
    "uk": "Жіноча стрижка"
  }
}</pre>
      </div>
      <div class="use-card">
        <h3>All endpoints</h3>
        <pre>/v1/index.jsonld
/v1/context.jsonld
/v1/category/&lt;slug&gt;.jsonld
/v1/subcategory/&lt;slug&gt;.jsonld
/v1/template/&lt;slug&gt;.jsonld
/sitemap.xml
/robots.txt</pre>
      </div>
    </div>
  </div>
</div>

<footer>
  v${esc(version)} &middot; MIT License &middot;
  Built by <a href="https://mapko.net">Mapko</a> &middot;
  <a href="https://github.com/es-ua/nace-osm-taxonomy">GitHub</a> &middot;
  <a href="https://www.npmjs.com/package/@mapko/nace-osm-taxonomy">npm</a>
</footer>

<script>
(function () {
  var IDX = ${idxJson};
  var q = document.getElementById('q');
  var res = document.getElementById('results');
  var cats = document.getElementById('cats');
  var typeUrl = { c: '/v1/category/', s: '/v1/subcategory/', tpl: '/v1/template/' };
  var typeBadge = { c: 'bc', s: 'bs', tpl: 'bt' };
  var typeLabel = { c: 'category', s: 'subcategory', tpl: 'template' };

  q.addEventListener('input', function () {
    var v = q.value.trim().toLowerCase();
    if (!v) {
      res.style.display = 'none';
      cats.style.display = '';
      return;
    }
    var hits = IDX.filter(function (x) {
      return x.n.toLowerCase().indexOf(v) !== -1 || x.s.indexOf(v) !== -1;
    }).slice(0, 60);
    cats.style.display = 'none';
    res.style.display = '';
    if (!hits.length) {
      res.innerHTML = '<div style="padding:.75rem 1rem;color:var(--g5)">No results.</div>';
      return;
    }
    res.innerHTML = hits.map(function (x) {
      var u = typeUrl[x.t] + x.s + '.jsonld';
      return '<a class="ri" href="' + u + '">'
        + '<span class="ri-name">' + x.n + '</span>'
        + (x.p ? '<span class="ri-par">' + x.p + '</span>' : '')
        + '<span class="badge ' + typeBadge[x.t] + '">' + typeLabel[x.t] + '</span>'
        + '</a>';
    }).join('');
  });
}());
</script>
</body>
</html>`;

  writeFileSync(join(outRoot, 'index.html'), html);
}

function main() {
  const { version, context, categories } = loadSource();

  ensureDir(outV1);
  ensureDir(join(outV1, 'category'));
  ensureDir(join(outV1, 'subcategory'));
  ensureDir(join(outV1, 'template'));

  // ── context.jsonld ──
  writeJsonld(join(outV1, 'context.jsonld'), context);

  // ── index.jsonld (whole tree) ──
  writeJsonld(join(outV1, 'index.jsonld'), {
    '@context': context['@context'] ?? context,
    '@id': SCHEME_URI,
    '@type': 'skos:ConceptScheme',
    version,
    categoriesCount: categories.length,
    categories,
  });

  // ── per-node files + sitemap URLs ──
  const urls = [`${BASE_URL}/`, `${V1}/`];
  let categoryCount = 0;
  let subcategoryCount = 0;
  let templateCount = 0;

  for (const category of categories) {
    const slug = category.slug;
    writeJsonld(
      join(outV1, 'category', `${slug}.jsonld`),
      nodeEnvelope(category, 'skos:Concept'),
    );
    urls.push(`${V1}/category/${slug}.jsonld`);
    categoryCount++;

    for (const sub of category.subcategories ?? []) {
      writeJsonld(
        join(outV1, 'subcategory', `${sub.slug}.jsonld`),
        nodeEnvelope(
          { ...sub, 'skos:broader': { '@id': category['@id'] } },
          'skos:Concept',
        ),
      );
      urls.push(`${V1}/subcategory/${sub.slug}.jsonld`);
      subcategoryCount++;

      for (const tpl of sub.templates ?? []) {
        writeJsonld(
          join(outV1, 'template', `${tpl.slug}.jsonld`),
          nodeEnvelope(
            { ...tpl, 'skos:broader': { '@id': sub['@id'] } },
            'skos:Concept',
          ),
        );
        urls.push(`${V1}/template/${tpl.slug}.jsonld`);
        templateCount++;
      }
    }
  }

  // ── sitemap.xml ──
  // Written at the root (standard crawler location) and mirrored under /v1
  // for back-compat with the nav link in the landing page.
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    `\n</urlset>\n`;
  writeFileSync(join(outRoot, 'sitemap.xml'), sitemap);
  writeFileSync(join(outV1, 'sitemap.xml'), sitemap);

  // ── robots.txt ──
  writeFileSync(
    join(outRoot, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`,
  );

  // ── dist/v1/index.html → redirect to landing ──
  writeFileSync(
    join(outV1, 'index.html'),
    `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/"><title>Redirecting…</title></head><body><a href="/">← Browse taxonomy</a></body></html>\n`,
  );

  // ── dist/index.html — browsable landing page ──
  generateLandingPage({ version, categories, categoryCount, subcategoryCount, templateCount });

  // ── Cloudflare Pages _headers ──
  writeFileSync(
    join(outRoot, '_headers'),
    `/v1/*.jsonld
  Content-Type: application/ld+json
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600

/v1/category/*
  Link: <${CONTEXT_URL}>; rel="http://www.w3.org/ns/json-ld#context"

/v1/subcategory/*
  Link: <${CONTEXT_URL}>; rel="http://www.w3.org/ns/json-ld#context"

/v1/template/*
  Link: <${CONTEXT_URL}>; rel="http://www.w3.org/ns/json-ld#context"
`,
  );

  console.log('');
  console.log('✓ Static site built:');
  console.log(`  version:       v${version}`);
  console.log(`  categories:    ${categoryCount}`);
  console.log(`  subcategories: ${subcategoryCount}`);
  console.log(`  templates:     ${templateCount}`);
  console.log(`  total URLs:    ${urls.length}`);
  console.log(`  out:           ${outRoot}`);
}

main();
