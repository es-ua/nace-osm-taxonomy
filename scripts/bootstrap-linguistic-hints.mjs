#!/usr/bin/env node
/**
 * Bootstrap minimal `linguisticHints` for every template that does NOT already have one.
 *
 * Strategy (bulk, lossless):
 *   - `triggers`: pull from the template's own `names` + `altLabels` per language.
 *   - `antiTriggers`: left as empty objects per language — filled in by later targeted PRs
 *     once a disambiguation pass is done per category.
 *   - `adjacentTemplates`: slugs of other templates in the same subcategory
 *     (best-effort "related" hint; manual curation can refine).
 *
 * This is a FLOOR — future PRs can enrich antiTriggers and adjacentTemplates with
 * category-specific knowledge. Skipping this bootstrap would leave 1329/1333 templates
 * without any entity-linker input beyond the slug, which hurts the Entity Linker v1
 * retrieval quality from day one.
 *
 * Usage:
 *   node nace-osm-taxonomy/scripts/bootstrap-linguistic-hints.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATEGORIES_DIR = join(ROOT, 'categories');
const LANGS = ['en', 'uk', 'de', 'ru'];

const files = readdirSync(CATEGORIES_DIR).filter((f) => f.endsWith('.json')).sort();

let totalTemplates = 0;
let bootstrapped = 0;
let alreadyHad = 0;

for (const file of files) {
  const path = join(CATEGORIES_DIR, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));

  let changedInFile = 0;

  for (const sub of data.subcategories ?? []) {
    const siblingSlugs = (sub.templates ?? []).map((t) => t.slug);

    for (const tpl of sub.templates ?? []) {
      totalTemplates++;

      if (tpl.linguisticHints) {
        alreadyHad++;
        continue;
      }

      const triggers = {};
      const antiTriggers = {};
      for (const lang of LANGS) {
        const nameVal = tpl.names?.[lang];
        const altVals = tpl.altLabels?.[lang] ?? [];
        const list = [];
        if (nameVal) list.push(nameVal.toLowerCase());
        for (const alt of altVals) {
          const normalised = typeof alt === 'string' ? alt.toLowerCase() : '';
          if (normalised && !list.includes(normalised)) list.push(normalised);
        }
        triggers[lang] = list;
        antiTriggers[lang] = [];
      }

      // adjacentTemplates: up to 3 sibling slugs (exclude self)
      const adjacent = siblingSlugs.filter((s) => s !== tpl.slug).slice(0, 3);

      tpl.linguisticHints = {
        triggers,
        antiTriggers,
        adjacentTemplates: adjacent,
      };

      bootstrapped++;
      changedInFile++;
    }
  }

  if (changedInFile > 0) {
    writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
    console.log(`  ${file.padEnd(30)} +${changedInFile} templates`);
  }
}

console.log('');
console.log(`Bootstrap complete:`);
console.log(`  total templates:       ${totalTemplates}`);
console.log(`  already had hints:     ${alreadyHad}`);
console.log(`  bootstrapped now:      ${bootstrapped}`);
