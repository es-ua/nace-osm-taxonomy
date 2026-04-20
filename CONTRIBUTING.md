# Contributing to NACE-OSM Taxonomy

Thanks for your interest! This project is an open multilingual SMB taxonomy and welcomes contributions.

## What you can contribute

- **New subcategories / templates** within existing root categories
- **New root categories** (heavier change — open an issue first)
- **Translations** — improve EN/UK/DE/RU, or add a new language (PL, RO, ES, FR, CS...)
- **Wikidata QIDs** — fill in missing `wikidataId` where you know the right QID
- **Schema.org types** — if you know a better Schema.org LocalBusiness subtype for an entry
- **altLabels / linguisticHints** — synonyms and classifier hints (entity-linking quality)
- **Bug fixes** — broken links, typos, wrong NACE codes, wrong OSM tags

## Ground rules

1. **Follow the v1.1.0 schema** (see `README.md`). All new entries must have:
   - `@id` URI under `https://taxonomy.mapko.net/v1/...`
   - `slug` (unique within scope)
   - `names` with all 4 canonical languages (EN/UK/DE/RU) + `original`
2. **The validator must pass** — run `node scripts/validate.mjs` locally before pushing.
3. **The JSON-LD must regenerate** — run `node scripts/build-jsonld.mjs` and commit the resulting `taxonomy.jsonld`.
4. **Keep changes additive** — do not remove or rename existing entries without a deprecation discussion.
5. **No proprietary content** — do not copy from Foursquare / Google My Business / Yelp / other commercial taxonomies. See the Attribution section in the README.

## PR workflow

1. **Fork** the repository (or create a branch if you have push access)
2. **Create a branch** named after your change: e.g. `feat/add-halal-restaurant`, `i18n/improve-de-translations`
3. **Make your edits** in the appropriate `categories/*.json` file
4. **Run the validator**: `node scripts/validate.mjs` — must pass
5. **Regenerate JSON-LD**: `node scripts/build-jsonld.mjs` — commit the updated `taxonomy.jsonld`
6. **Bump version** (for non-trivial changes): edit `VERSION` and `package.json`, add a CHANGELOG entry
7. **Open a PR** with clear title and before/after stats

## Validator rules (what the script checks)

- JSON parses without error
- Every subcategory has `slug` unique among subcategories
- Every category/subcategory/template has `names` with at least `en/uk/de/ru` keys
- Every subcategory has `templates` array (may be empty but must exist)
- Every category has `icon` and `naceRef`

## Building locally

```bash
git clone https://github.com/es-ua/nace-osm-taxonomy.git
cd nace-osm-taxonomy
node scripts/validate.mjs
node scripts/build-jsonld.mjs
```

## Release process (maintainers)

1. Update `VERSION` and `package.json` to new semver
2. Add `CHANGELOG.md` entry
3. Run validator + regenerate `taxonomy.jsonld`, commit everything
4. Merge to `main`
5. Tag: `git tag v1.12.0 && git push origin v1.12.0`
6. `.github/workflows/publish.yml` creates GitHub Release + publishes to npm (if NPM_TOKEN secret set)

## License

By contributing, you agree that your contributions will be licensed under MIT.
