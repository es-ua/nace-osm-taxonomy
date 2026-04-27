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
 * Output layout under dist/v1/:
 *   index.jsonld                       whole taxonomy
 *   context.jsonld                     @context file
 *   category/<slug>.jsonld             one per category
 *   subcategory/<slug>.jsonld          one per subcategory
 *   template/<slug>.jsonld             one per template
 *   sitemap.xml                        for crawlers
 *   index.html                         human-browsable landing stub
 *   ../_headers                        Cloudflare Pages response headers
 *
 * Each emitted JSONLD file carries:
 *   @context       URI of context.jsonld
 *   @id            the node's canonical URI
 *   @type          node type (skos:Concept* / schema:* etc.)
 *   skos:inScheme  back-link to the ConceptScheme
 *   plus all node fields (names, altLabels, linguisticHints, etc.)
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

  // ── sitemap.xml ──
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    `\n</urlset>\n`;
  writeFileSync(join(outV1, 'sitemap.xml'), sitemap);

  // ── index.html landing stub (Phase 3 will replace) ──
  writeFileSync(
    join(outV1, 'index.html'),
    `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>NACE-OSM Taxonomy v${version}</title>
<style>body{font:16px/1.5 system-ui;max-width:640px;margin:4rem auto;padding:0 1rem}</style>
</head>
<body>
<h1>NACE-OSM Taxonomy v${version}</h1>
<p>Open multilingual (EN/UK/DE/RU) SMB service taxonomy —
${categoryCount} categories, ${subcategoryCount} subcategories, ${templateCount} templates.</p>
<ul>
  <li><a href="/v1/index.jsonld">Full taxonomy (JSON-LD)</a></li>
  <li><a href="/v1/context.jsonld">@context</a></li>
  <li><a href="/v1/sitemap.xml">Sitemap</a></li>
  <li><a href="https://github.com/es-ua/nace-osm-taxonomy">Source on GitHub</a></li>
  <li><a href="https://www.npmjs.com/package/@mapko/nace-osm-taxonomy">Package on npm</a></li>
</ul>
<p>Every <code>@id</code> URI under <code>/v1/{category,subcategory,template}/&lt;slug&gt;</code>
resolves to its JSON-LD document.</p>
</body>
</html>
`,
  );

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
