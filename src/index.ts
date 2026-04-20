/**
 * @mapko/nace-osm-taxonomy
 *
 * Open multilingual SMB service taxonomy: NACE Rev.2 + OpenStreetMap
 * + Schema.org + Wikidata. Designed as the upper ontology for the Mapko
 * federated Knowledge Graph.
 *
 * Usage:
 *   import { loadTaxonomy, findSubcategoryBySlug } from '@mapko/nace-osm-taxonomy';
 *   const taxonomy = loadTaxonomy();
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Category, Subcategory, Template, TaxonomyDocument } from './types.js';

export * from './types.js';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATEGORIES_DIR = join(PACKAGE_ROOT, 'categories');
const VERSION_PATH = join(PACKAGE_ROOT, 'VERSION');

let cachedCategories: Category[] | null = null;

export function getVersion(): string {
  return readFileSync(VERSION_PATH, 'utf8').trim();
}

export function loadCategories(): Category[] {
  if (cachedCategories) return cachedCategories;
  const files = readdirSync(CATEGORIES_DIR).filter((f) => f.endsWith('.json')).sort();
  cachedCategories = files.map(
    (f) => JSON.parse(readFileSync(join(CATEGORIES_DIR, f), 'utf8')) as Category
  );
  return cachedCategories;
}

export function loadTaxonomy(): TaxonomyDocument {
  const categories = loadCategories();
  return {
    '@context': 'https://taxonomy.mapko.net/v1/context.jsonld',
    '@id': 'https://taxonomy.mapko.net/v1/',
    '@type': 'skos:ConceptScheme',
    version: getVersion(),
    generatedAt: new Date().toISOString(),
    categoriesCount: categories.length,
    categories,
  };
}

export function findCategoryBySlug(slug: string): Category | undefined {
  return loadCategories().find((c) => c.slug === slug);
}

export function findSubcategoryBySlug(slug: string): Subcategory | undefined {
  for (const cat of loadCategories()) {
    const sub = cat.subcategories.find((s) => s.slug === slug);
    if (sub) return sub;
  }
  return undefined;
}

export function findTemplate(
  subcategorySlug: string,
  templateSlug: string
): Template | undefined {
  const sub = findSubcategoryBySlug(subcategorySlug);
  return sub?.templates.find((t) => t.slug === templateSlug);
}

export function findByOsmTag(osmTag: string): Subcategory[] {
  const matches: Subcategory[] = [];
  for (const cat of loadCategories()) {
    for (const sub of cat.subcategories) {
      if (sub.osmTag === osmTag) matches.push(sub);
    }
  }
  return matches;
}

export function findByNaceRef(naceRef: string): Subcategory[] {
  const matches: Subcategory[] = [];
  for (const cat of loadCategories()) {
    for (const sub of cat.subcategories) {
      if (sub.naceRef === naceRef || cat.naceRef === naceRef) matches.push(sub);
    }
  }
  return matches;
}

export function findByWikidataId(qid: string): Array<Category | Subcategory | Template> {
  const matches: Array<Category | Subcategory | Template> = [];
  for (const cat of loadCategories()) {
    if (cat.wikidataId === qid) matches.push(cat);
    for (const sub of cat.subcategories) {
      if (sub.wikidataId === qid) matches.push(sub);
      for (const tpl of sub.templates) {
        if (tpl.wikidataId === qid) matches.push(tpl);
      }
    }
  }
  return matches;
}
