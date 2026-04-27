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
 *   dist/robots.txt                    crawl directives + Sitemap pointer
 *   dist/sitemap.xml                   sitemap-index → pages + v1
 *   dist/sitemap-pages.xml             landing in 4 langs with hreflang
 *   dist/v1/index.jsonld               whole taxonomy
 *   dist/v1/context.jsonld             @context file
 *   dist/v1/category/<slug>.jsonld     one per category
 *   dist/v1/subcategory/<slug>.jsonld  one per subcategory
 *   dist/v1/template/<slug>.jsonld     one per template
 *   dist/v1/sitemap.xml                for crawlers (JSON-LD endpoints)
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
  const changelogFile = join(root, 'CHANGELOG.md');
  if (!existsSync(categoriesDir)) throw new Error(`categories dir not found: ${categoriesDir}`);

  const version = existsSync(versionFile)
    ? readFileSync(versionFile, 'utf8').trim()
    : 'unknown';
  const context = JSON.parse(readFileSync(contextFile, 'utf8'));
  const categoryFiles = readdirSync(categoriesDir).filter((f) => f.endsWith('.json')).sort();
  const categories = categoryFiles.map((f) =>
    JSON.parse(readFileSync(join(categoriesDir, f), 'utf8')),
  );
  // Pull lastmod date from the most recent CHANGELOG entry. Format expected:
  //   ## [1.12.0] — 2026-04-20    (em-dash) or - or — between version and date.
  // This keeps sitemap deterministic — bumps with each version, not with each
  // CI rebuild — matching the precedent set by removing generatedAt earlier.
  let lastmod = null;
  if (existsSync(changelogFile)) {
    const text = readFileSync(changelogFile, 'utf8');
    const m = text.match(/^##\s*\[[^\]]+\]\s*[—\-–]\s*(\d{4}-\d{2}-\d{2})/m);
    if (m) lastmod = m[1];
  }
  if (!lastmod) lastmod = new Date().toISOString().slice(0, 10);
  console.log(`Loading taxonomy v${version} from ${root} (lastmod=${lastmod})`);
  return { version, context, categories, lastmod };
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
  // Per-slug name dictionaries for all 4 languages — used by JS to swap labels
  // when the user changes the active language. Keyed by slug, value: [en,uk,de,ru].
  const NAMES = { c: {}, s: {}, tpl: {} };
  // Compact search index — entries reference NAMES by slug (saves ~40% size)
  // Each entry: [type, slug, parentSlug?, osmTag?, altLabelsJoined?]
  const idx = [];
  const langKeys = ['en', 'uk', 'de', 'ru'];
  const pickNames = (n) => langKeys.map((k) => (n && n[k]) || (n && n.en) || '');
  const flatAlt = (al) => {
    if (!al) return '';
    const out = [];
    for (const k of langKeys) {
      const arr = al[k];
      if (Array.isArray(arr)) for (const v of arr) if (v) out.push(String(v).toLowerCase());
    }
    return out.join('|');
  };

  for (const cat of categories) {
    NAMES.c[cat.slug] = pickNames(cat.names);
    idx.push({ t: 'c', s: cat.slug, a: flatAlt(cat.altLabels) });
    for (const sub of cat.subcategories ?? []) {
      NAMES.s[sub.slug] = pickNames(sub.names);
      idx.push({
        t: 's',
        s: sub.slug,
        p: cat.slug,
        o: sub.osmTag || '',
        a: flatAlt(sub.altLabels),
      });
      for (const tpl of sub.templates ?? []) {
        NAMES.tpl[tpl.slug] = pickNames(tpl.names);
        idx.push({
          t: 'tpl',
          s: tpl.slug,
          p: sub.slug,
          a: flatAlt(tpl.altLabels),
        });
      }
    }
  }
  // Escape </script> inside JSON to prevent premature tag close
  const safeJson = (v) => JSON.stringify(v).replace(/<\//g, '<\\/');
  const idxJson = safeJson(idx);
  const namesJson = safeJson(NAMES);

  // Category accordion HTML (details/summary — works without JS).
  // Slug-bearing text nodes carry data-s + a class marker so the language
  // switcher can swap their textContent from the NAMES dict on the fly.
  const catsHtml = categories.map((cat) => {
    const subCount = (cat.subcategories ?? []).length;
    const tplCount = (cat.subcategories ?? []).reduce((n, s) => n + (s.templates ?? []).length, 0);
    const subsHtml = (cat.subcategories ?? []).map((sub) => {
      const tplsHtml = (sub.templates ?? [])
        .map((tpl) =>
          `<a class="tpl" data-s="${esc(tpl.slug)}" href="/v1/template/${tpl.slug}.jsonld">${esc(tpl.names.en)}</a>`,
        )
        .join('');
      const refsParts = [];
      if (sub.osmTag) refsParts.push(`<code class="osm">${esc(sub.osmTag)}</code>`);
      if (sub.naceRef) refsParts.push(`<span class="nace">NACE ${esc(sub.naceRef)}</span>`);
      if (sub.wikidataId) refsParts.push(
        `<a class="wd" href="https://www.wikidata.org/wiki/${esc(sub.wikidataId)}" target="_blank" rel="noopener">${esc(sub.wikidataId)}</a>`,
      );
      const refsHtml = refsParts.length
        ? `<div class="sub-refs">${refsParts.join('<span class="sep">·</span>')}</div>`
        : '';
      return (
        `<div class="sub">` +
        `<div class="sub-hdr"><span class="sub-name" data-s="${esc(sub.slug)}">${esc(sub.names.en)}</span>` +
        `<span class="sub-cnt">${(sub.templates ?? []).length}</span></div>` +
        refsHtml +
        `<div class="tpls">${tplsHtml}</div>` +
        `</div>`
      );
    }).join('');
    return (
      `<details class="cat">\n` +
      `<summary class="cat-hdr">` +
      `<span class="cat-icon">${esc(cat.icon ?? '')}</span>` +
      `<div class="cat-info"><span class="cat-name" data-s="${esc(cat.slug)}">${esc(cat.names.en)}</span>` +
      `<span class="cat-meta" data-im="${esc(cat.naceRef ?? '')}|${subCount}|${tplCount}">${esc(cat.naceRef)} &middot; ${subCount} subcategories &middot; ${tplCount} templates</span></div>` +
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
<link rel="canonical" href="${BASE_URL}/">
<link rel="alternate" hreflang="en" href="${BASE_URL}/?lang=en">
<link rel="alternate" hreflang="uk" href="${BASE_URL}/?lang=uk">
<link rel="alternate" hreflang="de" href="${BASE_URL}/?lang=de">
<link rel="alternate" hreflang="ru" href="${BASE_URL}/?lang=ru">
<link rel="alternate" hreflang="x-default" href="${BASE_URL}/">
<meta property="og:type" content="website">
<meta property="og:url" content="${BASE_URL}/">
<meta property="og:title" content="NACE-OSM Taxonomy — Open Multilingual SMB Classification">
<meta property="og:description" content="${categoryCount} categories · ${subcategoryCount} subcategories · ${templateCount} multilingual service templates. NACE Rev.2 + OSM + Schema.org + Wikidata. MIT.">
<meta property="og:locale" content="en_US">
<meta property="og:locale:alternate" content="uk_UA">
<meta property="og:locale:alternate" content="de_DE">
<meta property="og:locale:alternate" content="ru_RU">
<meta name="twitter:card" content="summary">
<style>
:root{--blue:#2563EB;--blue-lt:#EFF6FF;--g9:#111827;--g7:#374151;--g5:#6B7280;--g3:#D1D5DB;--g1:#F9FAFB;--r:8px}
*{box-sizing:border-box;margin:0;padding:0}
body{font:16px/1.6 system-ui,sans-serif;color:var(--g9);background:#fff}
a{color:var(--blue);text-decoration:none}
code{font-family:ui-monospace,monospace;font-size:.88em;background:var(--g1);padding:.1em .35em;border-radius:4px;border:1px solid var(--g3)}
nav{display:flex;align-items:center;justify-content:space-between;padding:.75rem 2rem;border-bottom:1px solid var(--g3);position:sticky;top:0;background:#fff;z-index:10}
.logo{font-weight:700;font-size:1.05rem;color:var(--g9)}
.logo em{font-style:normal;color:var(--blue)}
.nav-right{display:flex;align-items:center;gap:1rem}
.nav-links{display:flex;gap:1.5rem;font-size:.875rem}
.nav-links a{color:var(--g5);transition:color .15s}
.nav-links a:hover{color:var(--blue)}
.lang-switch{display:flex;border:1px solid var(--g3);border-radius:6px;overflow:hidden}
.lang-btn{font:inherit;font-size:.72rem;font-weight:600;padding:.3rem .55rem;background:#fff;border:0;border-right:1px solid var(--g3);color:var(--g5);cursor:pointer;transition:background .1s,color .1s;letter-spacing:.03em}
.lang-btn:last-child{border-right:0}
.lang-btn:hover{background:var(--g1);color:var(--g7)}
.lang-btn.active{background:var(--blue);color:#fff}
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
.sub-refs{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;font-size:.72rem;color:var(--g5);margin-bottom:.4rem;line-height:1.4}
.sub-refs .osm{font-family:ui-monospace,monospace;font-size:.72rem;background:var(--blue-lt);color:var(--blue);padding:.1em .4em;border-radius:4px;border:1px solid #BFDBFE}
.sub-refs .nace{font-size:.72rem;color:var(--g7)}
.sub-refs .wd{font-size:.72rem;color:var(--g5);font-variant-numeric:tabular-nums}
.sub-refs .wd:hover{color:var(--blue)}
.sub-refs .sep{color:var(--g3)}
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
  .nav-links{display:none}
  .nav-right{gap:.5rem}
  nav{padding:.75rem 1rem}
  .section{padding:3rem 1rem}
}
</style>
</head>
<body>

<nav>
  <a class="logo" href="/"><em>NACE-OSM</em> <span data-i="logo_suffix">Taxonomy</span></a>
  <div class="nav-right">
    <div class="nav-links">
      <a href="/v1/index.jsonld">JSON-LD</a>
      <a href="/v1/sitemap.xml" data-i="nav_sitemap">Sitemap</a>
      <a href="https://github.com/es-ua/nace-osm-taxonomy">GitHub</a>
      <a href="https://www.npmjs.com/package/@mapko/nace-osm-taxonomy">npm</a>
    </div>
    <div class="lang-switch" role="group" aria-label="Language">
      <button class="lang-btn active" type="button" data-l="en">EN</button>
      <button class="lang-btn" type="button" data-l="uk">UK</button>
      <button class="lang-btn" type="button" data-l="de">DE</button>
      <button class="lang-btn" type="button" data-l="ru">RU</button>
    </div>
  </div>
</nav>

<div class="hero">
  <h1><span data-i="hero_h1_pre">Open </span><em data-i="hero_h1_em">multilingual</em><br><span data-i="hero_h1_post">SMB taxonomy</span></h1>
  <p class="hero-sub" data-i="hero_sub">Maps NACE Rev.2 industry codes to OSM tags with 4-language service templates — for local directories, marketplaces, and knowledge graphs.</p>
  <div class="stats">
    <div class="stat"><div class="stat-n">${categoryCount}</div><div class="stat-l" data-i="stat_cats">Categories</div></div>
    <div class="stat"><div class="stat-n">${subcategoryCount}</div><div class="stat-l" data-i="stat_subs">Subcategories</div></div>
    <div class="stat"><div class="stat-n">${templateCount}</div><div class="stat-l" data-i="stat_tpls">Templates</div></div>
    <div class="stat"><div class="stat-n">4</div><div class="stat-l" data-i="stat_langs">Languages</div></div>
  </div>
  <div class="ctas">
    <a class="btn btn-blue" href="https://github.com/es-ua/nace-osm-taxonomy" data-i="cta_github">View on GitHub</a>
    <a class="btn btn-out" href="https://www.npmjs.com/package/@mapko/nace-osm-taxonomy" data-i="cta_npm">npm package</a>
    <a class="btn btn-out" href="/v1/index.jsonld" data-i="cta_jsonld">Full JSON-LD</a>
  </div>
</div>

<div class="section">
  <h2 data-i="what_h2">What is it?</h2>
  <div class="cards">
    <div class="card">
      <h3 data-i="card1_h">Standards-based</h3>
      <p data-i="card1_p">Rooted in NACE Rev.2 (EU statistical classification) and OpenStreetMap community tags. Every node carries a Schema.org type and Wikidata QID.</p>
    </div>
    <div class="card">
      <h3 data-i="card2_h">Linked Data ready</h3>
      <p data-i="card2_p_html">Every category, subcategory, and template has a stable <code>@id</code> URI that resolves to its JSON-LD document on this site.</p>
    </div>
    <div class="card">
      <h3 data-i="card3_h">Multilingual</h3>
      <p data-it="card3_p_tpl|${templateCount}">All ${templateCount} templates translated into English, Ukrainian, German, and Russian — with linguistic hints for NLP pipelines.</p>
    </div>
    <div class="card">
      <h3 data-i="card4_h">MIT licensed</h3>
      <p data-i="card4_p_html">Free for commercial and open-source use. Built by <a href="https://mapko.net">Mapko</a> as the upper ontology for its business knowledge graph.</p>
    </div>
  </div>
</div>

<div class="section">
  <h2 data-i="browse_h2">Browse</h2>
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
    <h2 data-i="use_h2">Use it</h2>
    <div class="use-grid">
      <div class="use-card">
        <h3 data-i="use_npm">npm</h3>
        <pre>npm i @mapko/nace-osm-taxonomy

import tax from
  '@mapko/nace-osm-taxonomy'

// tax.categories[0]
//   .subcategories[0]
//   .templates[0].names.en</pre>
      </div>
      <div class="use-card">
        <h3 data-i="use_rest">REST / JSON-LD</h3>
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
        <h3 data-i="use_endpoints">All endpoints</h3>
        <pre>/v1/index.jsonld
/v1/context.jsonld
/v1/category/&lt;slug&gt;.jsonld
/v1/subcategory/&lt;slug&gt;.jsonld
/v1/template/&lt;slug&gt;.jsonld
/v1/sitemap.xml</pre>
      </div>
    </div>
  </div>
</div>

<footer>
  v${esc(version)} &middot; <span data-i="footer_license">MIT License</span> &middot;
  <span data-i="footer_built">Built by</span> <a href="https://mapko.net">Mapko</a> &middot;
  <a href="https://github.com/es-ua/nace-osm-taxonomy">GitHub</a> &middot;
  <a href="https://www.npmjs.com/package/@mapko/nace-osm-taxonomy">npm</a>
</footer>

<script>
(function () {
  var LANGS = ['en','uk','de','ru'];
  var IDX = ${idxJson};
  var NAMES = ${namesJson};
  var TPL = ${templateCount};
  var CATS = ${categoryCount};
  var SUBS = ${subcategoryCount};
  // UI strings. {0}/{1}/{C}/{S}/{T} are simple placeholders; %s = HTML allowed.
  var UI = {
    en: {
      logo_suffix: 'Taxonomy',
      nav_sitemap: 'Sitemap',
      hero_h1_pre: 'Open ', hero_h1_em: 'multilingual', hero_h1_post: 'SMB taxonomy',
      hero_sub: 'Maps NACE Rev.2 industry codes to OSM tags with 4-language service templates — for local directories, marketplaces, and knowledge graphs.',
      stat_cats: 'Categories', stat_subs: 'Subcategories', stat_tpls: 'Templates', stat_langs: 'Languages',
      cta_github: 'View on GitHub', cta_npm: 'npm package', cta_jsonld: 'Full JSON-LD',
      what_h2: 'What is it?',
      card1_h: 'Standards-based', card1_p: 'Rooted in NACE Rev.2 (EU statistical classification) and OpenStreetMap community tags. Every node carries a Schema.org type and Wikidata QID.',
      card2_h: 'Linked Data ready', card2_p_html: 'Every category, subcategory, and template has a stable <code>@id</code> URI that resolves to its JSON-LD document on this site.',
      card3_h: 'Multilingual', card3_p_tpl: 'All {0} templates translated into English, Ukrainian, German, and Russian — with linguistic hints for NLP pipelines.',
      card4_h: 'MIT licensed', card4_p_html: 'Free for commercial and open-source use. Built by <a href="https://mapko.net">Mapko</a> as the upper ontology for its business knowledge graph.',
      browse_h2: 'Browse',
      use_h2: 'Use it', use_npm: 'npm', use_rest: 'REST / JSON-LD', use_endpoints: 'All endpoints',
      footer_license: 'MIT License', footer_built: 'Built by',
      cat_meta: '{0} subcategories · {1} templates',
      cat_meta_nace: '{0} · {1} subcategories · {2} templates',
      search_ph: 'Search {0} templates…',
      no_results: 'No results.',
      type_c: 'category', type_s: 'subcategory', type_tpl: 'template',
      meta_desc: 'Open multilingual (EN/UK/DE/RU) SMB service taxonomy — {C} categories, {S} subcategories, {T} templates. JSON-LD, npm package, REST API.'
    },
    uk: {
      logo_suffix: 'Таксономія',
      nav_sitemap: 'Карта сайту',
      hero_h1_pre: 'Відкрита ', hero_h1_em: 'багатомовна', hero_h1_post: 'таксономія МСБ',
      hero_sub: 'Зв’язує коди NACE Rev.2 із тегами OSM і шаблонами послуг чотирма мовами — для локальних довідників, маркетплейсів і графів знань.',
      stat_cats: 'Категорії', stat_subs: 'Підкатегорії', stat_tpls: 'Шаблони', stat_langs: 'Мови',
      cta_github: 'GitHub', cta_npm: 'npm-пакет', cta_jsonld: 'Повний JSON-LD',
      what_h2: 'Що це?',
      card1_h: 'На основі стандартів', card1_p: 'У основі — NACE Rev.2 (статистична класифікація ЄС) і теги спільноти OpenStreetMap. Кожен вузол має тип Schema.org і Wikidata QID.',
      card2_h: 'Готова до Linked Data', card2_p_html: 'Кожна категорія, підкатегорія й шаблон має стабільний URI <code>@id</code>, який відкриває JSON-LD-документ на цьому сайті.',
      card3_h: 'Багатомовна', card3_p_tpl: 'Усі {0} шаблонів перекладено англійською, українською, німецькою та російською — з лінгвістичними підказками для NLP.',
      card4_h: 'Ліцензія MIT', card4_p_html: 'Вільна для комерційного й відкритого використання. Створена <a href="https://mapko.net">Mapko</a> як верхня онтологія графа знань про бізнеси.',
      browse_h2: 'Огляд',
      use_h2: 'Використання', use_npm: 'npm', use_rest: 'REST / JSON-LD', use_endpoints: 'Усі endpoint-и',
      footer_license: 'Ліцензія MIT', footer_built: 'Створено',
      cat_meta: '{0} підкатегорій · {1} шаблонів',
      cat_meta_nace: '{0} · {1} підкатегорій · {2} шаблонів',
      search_ph: 'Пошук серед {0} шаблонів…',
      no_results: 'Нічого не знайдено.',
      type_c: 'категорія', type_s: 'підкатегорія', type_tpl: 'шаблон',
      meta_desc: 'Відкрита багатомовна (EN/UK/DE/RU) таксономія послуг МСБ — {C} категорій, {S} підкатегорій, {T} шаблонів. JSON-LD, npm, REST API.'
    },
    de: {
      logo_suffix: 'Taxonomie',
      nav_sitemap: 'Sitemap',
      hero_h1_pre: 'Offene ', hero_h1_em: 'mehrsprachige', hero_h1_post: 'KMU-Taxonomie',
      hero_sub: 'Verknüpft NACE-Rev.2-Codes mit OSM-Tags und Dienstleistungsvorlagen in vier Sprachen — für lokale Verzeichnisse, Marktplätze und Wissensgraphen.',
      stat_cats: 'Kategorien', stat_subs: 'Unterkategorien', stat_tpls: 'Vorlagen', stat_langs: 'Sprachen',
      cta_github: 'Auf GitHub ansehen', cta_npm: 'npm-Paket', cta_jsonld: 'Voll-JSON-LD',
      what_h2: 'Was ist das?',
      card1_h: 'Standardbasiert', card1_p: 'Aufgebaut auf NACE Rev.2 (statistische EU-Klassifikation) und OpenStreetMap-Community-Tags. Jeder Knoten trägt einen Schema.org-Typ und eine Wikidata-QID.',
      card2_h: 'Linked-Data-bereit', card2_p_html: 'Jede Kategorie, Unterkategorie und Vorlage hat eine stabile <code>@id</code>-URI, die das JSON-LD-Dokument auf dieser Site liefert.',
      card3_h: 'Mehrsprachig', card3_p_tpl: 'Alle {0} Vorlagen sind ins Englische, Ukrainische, Deutsche und Russische übersetzt — mit linguistischen Hinweisen für NLP-Pipelines.',
      card4_h: 'MIT-lizenziert', card4_p_html: 'Frei für kommerzielle und Open-Source-Nutzung. Gebaut von <a href="https://mapko.net">Mapko</a> als obere Ontologie seines Business-Wissensgraphen.',
      browse_h2: 'Durchsuchen',
      use_h2: 'Verwendung', use_npm: 'npm', use_rest: 'REST / JSON-LD', use_endpoints: 'Alle Endpunkte',
      footer_license: 'MIT-Lizenz', footer_built: 'Gebaut von',
      cat_meta: '{0} Unterkategorien · {1} Vorlagen',
      cat_meta_nace: '{0} · {1} Unterkategorien · {2} Vorlagen',
      search_ph: '{0} Vorlagen durchsuchen…',
      no_results: 'Keine Ergebnisse.',
      type_c: 'Kategorie', type_s: 'Unterkategorie', type_tpl: 'Vorlage',
      meta_desc: 'Offene mehrsprachige (EN/UK/DE/RU) KMU-Dienstleistungstaxonomie — {C} Kategorien, {S} Unterkategorien, {T} Vorlagen. JSON-LD, npm, REST API.'
    },
    ru: {
      logo_suffix: 'Таксономия',
      nav_sitemap: 'Карта сайта',
      hero_h1_pre: 'Открытая ', hero_h1_em: 'многоязычная', hero_h1_post: 'таксономия МСБ',
      hero_sub: 'Связывает коды NACE Rev.2 с тегами OSM и шаблонами услуг на четырёх языках — для локальных справочников, маркетплейсов и графов знаний.',
      stat_cats: 'Категории', stat_subs: 'Подкатегории', stat_tpls: 'Шаблоны', stat_langs: 'Языки',
      cta_github: 'GitHub', cta_npm: 'npm-пакет', cta_jsonld: 'Полный JSON-LD',
      what_h2: 'Что это?',
      card1_h: 'На основе стандартов', card1_p: 'В основе — NACE Rev.2 (статистическая классификация ЕС) и теги сообщества OpenStreetMap. Каждый узел несёт тип Schema.org и Wikidata QID.',
      card2_h: 'Готова к Linked Data', card2_p_html: 'У каждой категории, подкатегории и шаблона есть стабильный URI <code>@id</code>, отдающий JSON-LD-документ на этом сайте.',
      card3_h: 'Многоязычная', card3_p_tpl: 'Все {0} шаблонов переведены на английский, украинский, немецкий и русский — с лингвистическими подсказками для NLP.',
      card4_h: 'Лицензия MIT', card4_p_html: 'Свободна для коммерческого и open-source использования. Создана <a href="https://mapko.net">Mapko</a> как верхняя онтология графа знаний о бизнесах.',
      browse_h2: 'Обзор',
      use_h2: 'Использование', use_npm: 'npm', use_rest: 'REST / JSON-LD', use_endpoints: 'Все endpoint-ы',
      footer_license: 'Лицензия MIT', footer_built: 'Создано',
      cat_meta: '{0} подкатегорий · {1} шаблонов',
      cat_meta_nace: '{0} · {1} подкатегорий · {2} шаблонов',
      search_ph: 'Поиск среди {0} шаблонов…',
      no_results: 'Ничего не найдено.',
      type_c: 'категория', type_s: 'подкатегория', type_tpl: 'шаблон',
      meta_desc: 'Открытая многоязычная (EN/UK/DE/RU) таксономия услуг МСБ — {C} категорий, {S} подкатегорий, {T} шаблонов. JSON-LD, npm, REST API.'
    }
  };
  var LANG_HTML = { en: 'en', uk: 'uk', de: 'de', ru: 'ru' };
  var LANG_INDEX = { en: 0, uk: 1, de: 2, ru: 3 };

  function fmt(s, args) {
    if (!s) return s;
    return s.replace(/\\{(\\d+)\\}/g, function (_, i) { return args[+i] != null ? args[+i] : ''; });
  }
  function nameOf(type, slug, lang) {
    var bucket = NAMES[type];
    if (!bucket || !bucket[slug]) return slug;
    var arr = bucket[slug];
    return arr[LANG_INDEX[lang]] || arr[0] || slug;
  }

  function applyLang(lang) {
    if (!UI[lang]) lang = 'en';
    var ui = UI[lang];
    document.documentElement.lang = LANG_HTML[lang];

    // Plain UI text nodes (data-i)
    var els = document.querySelectorAll('[data-i]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var k = el.getAttribute('data-i');
      var v = ui[k];
      if (v == null) continue;
      if (/_html$/.test(k)) el.innerHTML = v; else el.textContent = v;
    }

    // Templated UI text nodes (data-it="key|arg0|arg1")
    var elts = document.querySelectorAll('[data-it]');
    for (var j = 0; j < elts.length; j++) {
      var elj = elts[j];
      var spec = elj.getAttribute('data-it').split('|');
      var key = spec[0];
      var args = spec.slice(1);
      var tpl = ui[key];
      if (tpl == null) continue;
      elj.textContent = fmt(tpl, args);
    }

    // Category meta line: "I55 · 4 subcategories · 46 templates"
    var metas = document.querySelectorAll('[data-im]');
    for (var m = 0; m < metas.length; m++) {
      var em = metas[m];
      var p = em.getAttribute('data-im').split('|');
      var nace = p[0], n = p[1], t = p[2];
      em.textContent = nace
        ? fmt(ui.cat_meta_nace, [nace, n, t])
        : fmt(ui.cat_meta, [n, t]);
    }

    // Cat / sub / tpl names
    var cn = document.querySelectorAll('.cat-name[data-s]');
    for (var a = 0; a < cn.length; a++) cn[a].textContent = nameOf('c', cn[a].getAttribute('data-s'), lang);
    var sn = document.querySelectorAll('.sub-name[data-s]');
    for (var b = 0; b < sn.length; b++) sn[b].textContent = nameOf('s', sn[b].getAttribute('data-s'), lang);
    var tn = document.querySelectorAll('.tpl[data-s]');
    for (var c = 0; c < tn.length; c++) tn[c].textContent = nameOf('tpl', tn[c].getAttribute('data-s'), lang);

    // Search placeholder + meta description
    var qEl = document.getElementById('q');
    if (qEl && ui.search_ph) qEl.placeholder = fmt(ui.search_ph, [TPL]);
    var dm = document.querySelector('meta[name="description"]');
    if (dm && ui.meta_desc) dm.content = ui.meta_desc.replace('{C}', CATS).replace('{S}', SUBS).replace('{T}', TPL);

    // Active button
    var btns = document.querySelectorAll('.lang-btn');
    for (var x = 0; x < btns.length; x++) btns[x].classList.toggle('active', btns[x].getAttribute('data-l') === lang);

    // Persist + sync URL
    try { localStorage.setItem('lang', lang); } catch (e) {}
    try {
      var u = new URL(location.href);
      if (lang === 'en') u.searchParams.delete('lang'); else u.searchParams.set('lang', lang);
      history.replaceState(null, '', u.toString() + (u.search ? '' : ''));
    } catch (e) {}

    // Re-run search (so existing query updates labels)
    if (qEl && qEl.value) qEl.dispatchEvent(new Event('input'));
  }

  // Pick initial language: ?lang= → localStorage → en
  var initLang = 'en';
  try {
    var qp = new URLSearchParams(location.search).get('lang');
    if (qp && UI[qp]) initLang = qp;
    else { var ls = localStorage.getItem('lang'); if (ls && UI[ls]) initLang = ls; }
  } catch (e) {}

  // Wire switcher
  var langBtns = document.querySelectorAll('.lang-btn');
  for (var k0 = 0; k0 < langBtns.length; k0++) {
    langBtns[k0].addEventListener('click', function (ev) {
      applyLang(ev.currentTarget.getAttribute('data-l'));
    });
  }

  // ── Search ────────────────────────────────────────────────────────────
  var q = document.getElementById('q');
  var res = document.getElementById('results');
  var cats = document.getElementById('cats');
  var typeUrl = { c: '/v1/category/', s: '/v1/subcategory/', tpl: '/v1/template/' };
  var typeBadge = { c: 'bc', s: 'bs', tpl: 'bt' };

  function curLang() {
    return document.documentElement.lang && UI[document.documentElement.lang]
      ? document.documentElement.lang
      : 'en';
  }

  function searchHits(query) {
    var v = query.trim().toLowerCase();
    if (!v) return null;
    var hits = [];
    for (var i = 0; i < IDX.length; i++) {
      var x = IDX[i];
      // Match against slug (always EN-ish), osmTag, altLabels (any lang),
      // and all 4 names from NAMES dict.
      if (x.s.indexOf(v) !== -1) { hits.push(x); continue; }
      if (x.o && x.o.toLowerCase().indexOf(v) !== -1) { hits.push(x); continue; }
      if (x.a && x.a.indexOf(v) !== -1) { hits.push(x); continue; }
      var arr = NAMES[x.t] && NAMES[x.t][x.s];
      if (arr) {
        var matched = false;
        for (var l = 0; l < arr.length; l++) {
          if (arr[l] && arr[l].toLowerCase().indexOf(v) !== -1) { matched = true; break; }
        }
        if (matched) hits.push(x);
      }
      if (hits.length >= 60) break;
    }
    return hits;
  }

  function renderHits(hits) {
    if (hits === null) {
      res.style.display = 'none';
      cats.style.display = '';
      return;
    }
    cats.style.display = 'none';
    res.style.display = '';
    if (!hits.length) {
      res.innerHTML = '<div style="padding:.75rem 1rem;color:var(--g5)">' + UI[curLang()].no_results + '</div>';
      return;
    }
    var lang = curLang();
    var ui = UI[lang];
    var parts = [];
    for (var i = 0; i < hits.length; i++) {
      var x = hits[i];
      var u = typeUrl[x.t] + x.s + '.jsonld';
      var label = nameOf(x.t, x.s, lang);
      var parentSlug = x.p;
      var parentType = x.t === 'tpl' ? 's' : (x.t === 's' ? 'c' : null);
      var parent = parentSlug && parentType ? nameOf(parentType, parentSlug, lang) : '';
      var typeLbl = ui['type_' + x.t];
      parts.push(
        '<a class="ri" href="' + u + '">' +
        '<span class="ri-name">' + label + '</span>' +
        (parent ? '<span class="ri-par">' + parent + '</span>' : '') +
        '<span class="badge ' + typeBadge[x.t] + '">' + typeLbl + '</span>' +
        '</a>'
      );
    }
    res.innerHTML = parts.join('');
  }

  q.addEventListener('input', function () {
    renderHits(searchHits(q.value));
  });

  // Apply initial language now that handlers are wired
  applyLang(initLang);
}());
</script>
</body>
</html>`;

  writeFileSync(join(outRoot, 'index.html'), html);
}

function main() {
  const { version, context, categories, lastmod } = loadSource();

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
  const urls = [`${V1}/`];
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

  // ── /v1/sitemap.xml — JSON-LD endpoints + landing redirect ──
  // <lastmod> is the date of the most recent CHANGELOG entry, so the value
  // changes only on real content bumps (matches the deterministic-build
  // policy from a7a786b).
  const v1Sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n') +
    `\n</urlset>\n`;
  writeFileSync(join(outV1, 'sitemap.xml'), v1Sitemap);

  // ── /sitemap-pages.xml — landing page in 4 languages with hreflang ──
  // Per Google's docs, every alternate language URL must also appear as its
  // own <url> entry, each cross-referencing all alternates (the "reciprocal"
  // rule). x-default points at the canonical EN URL.
  const langs = ['en', 'uk', 'de', 'ru'];
  const langUrl = (l) => l === 'en' ? `${BASE_URL}/` : `${BASE_URL}/?lang=${l}`;
  const altLinks = langs
    .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${langUrl(l)}"/>`)
    .concat([`    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/"/>`])
    .join('\n');
  const pageEntries = langs.map((l) =>
    `  <url>\n` +
    `    <loc>${langUrl(l)}</loc>\n` +
    `    <lastmod>${lastmod}</lastmod>\n` +
    `    <changefreq>weekly</changefreq>\n` +
    `    <priority>1.0</priority>\n` +
    altLinks + '\n' +
    `  </url>`,
  ).join('\n');
  const pagesSitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    pageEntries + `\n` +
    `</urlset>\n`;
  writeFileSync(join(outRoot, 'sitemap-pages.xml'), pagesSitemap);

  // ── /sitemap.xml — root sitemap index, points at the two real sitemaps ──
  // Google looks at /sitemap.xml first; the root index is the canonical
  // entrypoint and the existing /v1/sitemap.xml stays at its old URL for
  // backward compatibility with anyone who already linked it.
  const sitemapIndex =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <sitemap><loc>${BASE_URL}/sitemap-pages.xml</loc><lastmod>${lastmod}</lastmod></sitemap>\n` +
    `  <sitemap><loc>${V1}/sitemap.xml</loc><lastmod>${lastmod}</lastmod></sitemap>\n` +
    `</sitemapindex>\n`;
  writeFileSync(join(outRoot, 'sitemap.xml'), sitemapIndex);

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

  // ── robots.txt ──
  // Allow all bots. Explicit Allow on /v1/ is defensive — some crawlers
  // default-skip non-HTML extensions like .jsonld. Sitemap directive
  // points at the root sitemap index, which references both the landing
  // sitemap (with hreflang alternates) and the JSON-LD endpoint sitemap.
  writeFileSync(
    join(outRoot, 'robots.txt'),
    `User-agent: *
Allow: /
Allow: /v1/

Sitemap: ${BASE_URL}/sitemap.xml
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
