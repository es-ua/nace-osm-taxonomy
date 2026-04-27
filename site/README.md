# taxonomy.mapko.net — static JSON-LD publication

Phase 2 of the [taxonomy publication plan](../docs/mapko/taxonomy-publication-plan-adr.md).
Makes every `@id` URI in the taxonomy **actually dereference** to its JSON-LD
representation, so external Linked-Data consumers can follow the `@id` and
see the node's content.

## ⚠️ Intended location

This directory is meant to live **inside the public taxonomy repo** at
`es-ua/nace-osm-taxonomy/site/`, NOT in the mapkonet monorepo. Sitting next to
`categories/` lets the build read directly from sibling files (no npm round-trip)
so a category edit triggers a fresh deploy via the same workflow that publishes
to npm.

The copy currently in `mapkonet/taxonomy-site/` is a **staging area**. See
[MIGRATION.md](./MIGRATION.md) for the copy-paste instructions.

## What this produces

```
dist/v1/
├── index.jsonld                        ← full taxonomy (= taxonomy.jsonld)
├── context.jsonld                      ← @context file
├── category/
│   ├── beauty-wellness.jsonld          ← one file per category
│   ├── food-beverage.jsonld
│   └── …
├── subcategory/
│   ├── hair-salon.jsonld
│   ├── pizzeria.jsonld
│   └── …
├── template/
│   ├── womens-haircut.jsonld
│   ├── mens-haircut.jsonld
│   └── …
├── sitemap.xml                         ← for search engine discovery
└── index.html                          ← human-browsable landing
dist/_headers                           ← Cloudflare Pages headers
```

Every file is a valid self-contained JSON-LD document with `@context`,
`@id`, `@type`, `skos:inScheme` back-link to the ConceptScheme, plus
`skos:broader` for sub-nodes.

Served at `https://taxonomy.mapko.net/v1/...` so URIs like
`https://taxonomy.mapko.net/v1/template/womens-haircut` resolve.

## Build

```bash
npm install      # nothing in deps, just for npm version-pinning
npm run build
```

Reads from sibling `../categories/`, `../context.jsonld`, `../VERSION` —
no npm round-trip. Override path via `TAXONOMY_ROOT` env var if needed.

## Deploy (when in public repo)

GitHub Actions workflow `.github/workflows/deploy-site.yml` runs on push to
`main` (paths: `categories/**`, `site/**`, `context.jsonld`):
1. `npm install` (in `site/`)
2. `npm run build` (regenerates `dist/`)
3. Deploys `dist/` to Cloudflare Pages via `cloudflare/wrangler-action@v3`

Repo secrets required:
- `CLOUDFLARE_API_TOKEN` — token with "Pages:Edit" permission
- `CLOUDFLARE_ACCOUNT_ID`

Cloudflare Pages project:
- Name: `taxonomy-mapko-net`
- Custom domain: `taxonomy.mapko.net`
- DNS: CNAME → `taxonomy-mapko-net.pages.dev`

## Content negotiation

The `_headers` file (Cloudflare Pages convention) sets:

```
/v1/*.jsonld
  Content-Type: application/ld+json
  Access-Control-Allow-Origin: *
/v1/category/*
  Link: </v1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"
```

So a `curl -H "Accept: application/ld+json" https://taxonomy.mapko.net/v1/template/womens-haircut`
returns proper JSON-LD with the right content type. Browsers with HTML
accept header fall through to the static `index.html` landing page (Phase 3
of the publication plan replaces this stub with a richer browsable UI).

## Related

- [taxonomy-publication-plan-adr.md](../docs/mapko/taxonomy-publication-plan-adr.md)
- [@mapko/nace-osm-taxonomy on npm](https://www.npmjs.com/package/@mapko/nace-osm-taxonomy)
- [es-ua/nace-osm-taxonomy on GitHub](https://github.com/es-ua/nace-osm-taxonomy)
