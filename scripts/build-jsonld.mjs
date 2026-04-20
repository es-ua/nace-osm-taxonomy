#!/usr/bin/env node
/**
 * Build taxonomy.jsonld — single-file JSON-LD export combining all per-category files.
 *
 * Reads:  nace-osm-taxonomy/categories/*.json
 *         nace-osm-taxonomy/context.jsonld
 *         nace-osm-taxonomy/VERSION
 *
 * Writes: nace-osm-taxonomy/taxonomy.jsonld
 *
 * Usage:  node nace-osm-taxonomy/scripts/build-jsonld.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATEGORIES_DIR = join(ROOT, 'categories');
const CONTEXT_PATH = join(ROOT, 'context.jsonld');
const VERSION_PATH = join(ROOT, 'VERSION');
const OUTPUT_PATH = join(ROOT, 'taxonomy.jsonld');

const version = readFileSync(VERSION_PATH, 'utf8').trim();
const context = JSON.parse(readFileSync(CONTEXT_PATH, 'utf8'));

const categoryFiles = readdirSync(CATEGORIES_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();

const categories = categoryFiles.map((file) => {
  const raw = JSON.parse(readFileSync(join(CATEGORIES_DIR, file), 'utf8'));
  delete raw['@context'];
  return raw;
});

const output = {
  '@context': context['@context'],
  '@id': 'https://taxonomy.mapko.net/v1/',
  '@type': 'skos:ConceptScheme',
  version,
  categoriesCount: categories.length,
  categories,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
console.log(`✓ Wrote ${OUTPUT_PATH} (v${version}, ${categories.length} categories)`);
