#!/usr/bin/env node
/**
 * Coverage report for the taxonomy.
 *
 * Walks every category file under `categories/` and counts:
 *   • Schema.org type assignment (subcategory level — the only level that
 *     carries `schemaOrgType` per the v1.1 schema)
 *   • Wikidata QID assignment (subcategory + template level)
 *   • OSM tag assignment (subcategory + template level)
 *   • Translation completeness for all 4 languages (en, uk, de, ru)
 *   • linguisticHints.triggers presence (template level)
 *
 * Outputs a Markdown-friendly table to stdout.
 *
 * Exit codes:
 *   0 — all thresholds met
 *   1 — one or more thresholds not met (see THRESHOLDS below)
 *
 * Override thresholds via env vars, e.g.:
 *   COVERAGE_SUB_WIKIDATA=80 node scripts/coverage-report.mjs
 *
 * Designed to plug into CI as `npm run coverage`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATS_DIR = join(REPO_ROOT, 'categories');
const LANGS = ['en', 'uk', 'de', 'ru'];

const THRESHOLDS = {
  sub_schema_pct: Number(process.env.COVERAGE_SUB_SCHEMA ?? 90),
  sub_wikidata_pct: Number(process.env.COVERAGE_SUB_WIKIDATA ?? 85),
  sub_osm_pct: Number(process.env.COVERAGE_SUB_OSM ?? 95),
  sub_nace_pct: Number(process.env.COVERAGE_SUB_NACE ?? 99),
  tpl_triggers_pct: Number(process.env.COVERAGE_TPL_TRIGGERS ?? 95),
  translations_pct: Number(process.env.COVERAGE_TRANSLATIONS ?? 99),
};

function loadCategories() {
  return readdirSync(CATS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(CATS_DIR, f), 'utf8')));
}

function hasNonEmptyName(names, lang) {
  return !!(names && typeof names[lang] === 'string' && names[lang].trim());
}

function pct(num, denom) {
  if (denom === 0) return 100;
  return (num / denom) * 100;
}

function bar(p) {
  // 20-char unicode bar
  const filled = Math.round((p / 100) * 20);
  return '█'.repeat(filled) + '░'.repeat(20 - filled);
}

function fmt(p) {
  return p.toFixed(1).padStart(5) + '%';
}

function row(label, num, denom) {
  const p = pct(num, denom);
  return `${bar(p)} ${fmt(p)} ${label.padEnd(36)} ${num} / ${denom}`;
}

function main() {
  const cats = loadCategories();

  const stats = {
    cats: { total: 0, withWikidata: 0, withSchema: 0 },
    subs: { total: 0, withOsm: 0, withNace: 0, withWikidata: 0, withSchema: 0 },
    tpls: { total: 0, withWikidata: 0, withTriggers: 0, withOsm: 0 },
    trans: {
      cat: Object.fromEntries(LANGS.map((l) => [l, 0])),
      sub: Object.fromEntries(LANGS.map((l) => [l, 0])),
      tpl: Object.fromEntries(LANGS.map((l) => [l, 0])),
    },
  };

  // Slug uniqueness — duplicates would cause silent overwrites when building
  // per-slug JSON-LD endpoints under /v1/template/<slug>.jsonld etc.
  const slugSeen = { c: new Map(), s: new Map(), tpl: new Map() };
  const dupes = [];
  function note(kind, slug, where) {
    const m = slugSeen[kind];
    if (m.has(slug)) dupes.push({ kind, slug, first: m.get(slug), second: where });
    else m.set(slug, where);
  }

  for (const cat of cats) {
    stats.cats.total++;
    note('c', cat.slug, cat.slug);
    if (cat.wikidataId) stats.cats.withWikidata++;
    if (cat.schemaOrgType) stats.cats.withSchema++;
    for (const l of LANGS) if (hasNonEmptyName(cat.names, l)) stats.trans.cat[l]++;

    for (const sub of cat.subcategories ?? []) {
      stats.subs.total++;
      note('s', sub.slug, `${cat.slug} > ${sub.slug}`);
      if (sub.osmTag) stats.subs.withOsm++;
      if (sub.naceRef) stats.subs.withNace++;
      if (sub.wikidataId) stats.subs.withWikidata++;
      if (sub.schemaOrgType) stats.subs.withSchema++;
      for (const l of LANGS) if (hasNonEmptyName(sub.names, l)) stats.trans.sub[l]++;

      for (const tpl of sub.templates ?? []) {
        stats.tpls.total++;
        note('tpl', tpl.slug, `${cat.slug} > ${sub.slug} > ${tpl.slug}`);
        if (tpl.wikidataId) stats.tpls.withWikidata++;
        if (tpl.osmTag) stats.tpls.withOsm++;
        const t = tpl.linguisticHints?.triggers;
        const hasTriggers =
          t && LANGS.some((l) => Array.isArray(t[l]) && t[l].length > 0);
        if (hasTriggers) stats.tpls.withTriggers++;
        for (const l of LANGS) if (hasNonEmptyName(tpl.names, l)) stats.trans.tpl[l]++;
      }
    }
  }

  console.log(`\n# NACE-OSM Taxonomy — Coverage Report\n`);
  console.log(
    `Source: ${cats.length} category files · ${stats.subs.total} subcategories · ${stats.tpls.total} templates\n`,
  );

  console.log(`## Cross-references (subcategory level)\n`);
  console.log(row('Schema.org type (schemaOrgType)', stats.subs.withSchema, stats.subs.total));
  console.log(row('Wikidata QID (wikidataId)', stats.subs.withWikidata, stats.subs.total));
  console.log(row('OSM tag (osmTag)', stats.subs.withOsm, stats.subs.total));
  console.log(row('NACE Rev.2 ref (naceRef)', stats.subs.withNace, stats.subs.total));

  console.log(`\n## Templates\n`);
  console.log(row('Wikidata QID (wikidataId)', stats.tpls.withWikidata, stats.tpls.total));
  console.log(row('OSM tag (osmTag)', stats.tpls.withOsm, stats.tpls.total));
  console.log(row('linguisticHints.triggers', stats.tpls.withTriggers, stats.tpls.total));

  console.log(`\n## Translations\n`);
  for (const l of LANGS) {
    console.log(row(`Categories — ${l.toUpperCase()}`, stats.trans.cat[l], stats.cats.total));
  }
  for (const l of LANGS) {
    console.log(row(`Subcategories — ${l.toUpperCase()}`, stats.trans.sub[l], stats.subs.total));
  }
  for (const l of LANGS) {
    console.log(row(`Templates — ${l.toUpperCase()}`, stats.trans.tpl[l], stats.tpls.total));
  }

  // ── Threshold check ──────────────────────────────────────────────────
  const failures = [];
  function check(label, num, denom, threshold) {
    const p = pct(num, denom);
    if (p < threshold)
      failures.push(`${label}: ${p.toFixed(1)}% < ${threshold}%`);
  }
  check('subcategory Schema.org', stats.subs.withSchema, stats.subs.total, THRESHOLDS.sub_schema_pct);
  check('subcategory Wikidata', stats.subs.withWikidata, stats.subs.total, THRESHOLDS.sub_wikidata_pct);
  check('subcategory OSM tag', stats.subs.withOsm, stats.subs.total, THRESHOLDS.sub_osm_pct);
  check('subcategory NACE ref', stats.subs.withNace, stats.subs.total, THRESHOLDS.sub_nace_pct);
  check('template triggers', stats.tpls.withTriggers, stats.tpls.total, THRESHOLDS.tpl_triggers_pct);
  for (const l of LANGS) {
    check(`category ${l} translations`, stats.trans.cat[l], stats.cats.total, THRESHOLDS.translations_pct);
    check(`subcategory ${l} translations`, stats.trans.sub[l], stats.subs.total, THRESHOLDS.translations_pct);
    check(`template ${l} translations`, stats.trans.tpl[l], stats.tpls.total, THRESHOLDS.translations_pct);
  }

  if (dupes.length) {
    console.log(`\n## Duplicate slugs (warning — silent overwrite during /v1 build)\n`);
    for (const d of dupes) {
      console.log(`  ${d.kind}: "${d.slug}"  first=${d.first}  second=${d.second}`);
    }
    console.log(
      `\n  ⚠  Each duplicate causes one /v1/<kind>/<slug>.jsonld endpoint to be\n` +
      `     silently overwritten by the later occurrence. Consider renaming\n` +
      `     one of each pair to disambiguate. (Warning — does not fail CI.)`,
    );
  }

  console.log(`\n## Thresholds\n`);
  if (failures.length === 0) {
    if (dupes.length === 0) {
      console.log('✓ All thresholds met. No duplicate slugs.\n');
    } else {
      console.log(`✓ All thresholds met. (${dupes.length} duplicate slug warning(s) above.)\n`);
    }
    process.exit(0);
  }
  console.log('✗ Failures:\n');
  for (const f of failures) console.log('  - ' + f);
  console.log('');
  process.exit(1);
}

main();
