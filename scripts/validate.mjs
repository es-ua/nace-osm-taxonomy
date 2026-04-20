#!/usr/bin/env node
/**
 * Validate taxonomy structure: required fields, slug uniqueness, JSON syntax.
 *
 * Usage:    node nace-osm-taxonomy/scripts/validate.mjs
 * Exit 0:   all valid
 * Exit 1:   validation errors found (logged to stderr)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATEGORIES_DIR = join(ROOT, 'categories');

const errors = [];
const slugRegistry = { category: new Set(), subcategory: new Set(), template: new Set() };

const requireField = (obj, field, location) => {
  if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
    errors.push(`${location}: missing required field "${field}"`);
  }
};

const requireLangs = (names, location, langs = ['en', 'uk', 'de', 'ru']) => {
  if (!names || typeof names !== 'object') {
    errors.push(`${location}: "names" missing or not an object`);
    return;
  }
  for (const lang of langs) {
    if (!names[lang]) errors.push(`${location}: names.${lang} missing`);
  }
};

const checkUniqueSlug = (slug, kind, location) => {
  if (!slug) return;
  if (slugRegistry[kind].has(slug)) {
    errors.push(`${location}: duplicate ${kind} slug "${slug}"`);
  } else {
    slugRegistry[kind].add(slug);
  }
};

const validateTemplate = (tpl, parentLoc) => {
  const loc = `${parentLoc} > template[${tpl.slug || '?'}]`;
  requireField(tpl, 'slug', loc);
  requireField(tpl, 'names', loc);
  requireLangs(tpl.names, loc);
  // Note: template slugs are intentionally NOT globally unique
  // (e.g. "haircut" appears under both hair-salon and barbershop).
  // Uniqueness is enforced by @id URI which embeds parent path.
};

const validateSubcategory = (sub, parentLoc) => {
  const loc = `${parentLoc} > subcategory[${sub.slug || '?'}]`;
  requireField(sub, 'slug', loc);
  requireField(sub, 'names', loc);
  requireLangs(sub.names, loc);
  checkUniqueSlug(sub.slug, 'subcategory', loc);
  if (!Array.isArray(sub.templates)) {
    errors.push(`${loc}: "templates" missing or not an array`);
  } else {
    sub.templates.forEach((t) => validateTemplate(t, loc));
  }
};

const validateCategory = (cat, file) => {
  const loc = `${file}`;
  requireField(cat, 'slug', loc);
  requireField(cat, 'names', loc);
  requireField(cat, 'icon', loc);
  requireField(cat, 'naceRef', loc);
  requireLangs(cat.names, loc);
  checkUniqueSlug(cat.slug, 'category', loc);
  if (!Array.isArray(cat.subcategories)) {
    errors.push(`${loc}: "subcategories" missing or not an array`);
  } else {
    cat.subcategories.forEach((s) => validateSubcategory(s, loc));
  }
};

const files = readdirSync(CATEGORIES_DIR).filter((f) => f.endsWith('.json')).sort();
let totalCategories = 0;
let totalSubcategories = 0;
let totalTemplates = 0;

for (const file of files) {
  const path = join(CATEGORIES_DIR, file);
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    errors.push(`${file}: invalid JSON — ${e.message}`);
    continue;
  }
  validateCategory(raw, file);
  totalCategories++;
  if (Array.isArray(raw.subcategories)) {
    totalSubcategories += raw.subcategories.length;
    for (const sub of raw.subcategories) {
      if (Array.isArray(sub.templates)) totalTemplates += sub.templates.length;
    }
  }
}

if (errors.length > 0) {
  console.error(`✗ ${errors.length} validation error(s):\n`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(`✓ Taxonomy valid: ${totalCategories} categories, ${totalSubcategories} subcategories, ${totalTemplates} templates`);
