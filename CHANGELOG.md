# Changelog

All notable changes to this taxonomy are documented here. The project adheres to [Semantic Versioning](https://semver.org/).

## [1.12.0] — 2026-04-20

P1 entity-linking enablement — bootstrap pass.

### Added — `linguisticHints` on every template

All **1329** templates that did not yet have a `linguisticHints` block now carry one. The bootstrap is intentionally minimal and lossless:

- `triggers` (en/uk/de/ru) — seeded from the template's own `names` + `altLabels` (lowercased, de-duped). Entity Linker v1 can rely on the field being present everywhere instead of falling back per-template.
- `antiTriggers` (en/uk/de/ru) — empty placeholder objects; enrichment per category scheduled for v1.13+ targeted PRs.
- `adjacentTemplates` — up to 3 sibling slugs from the same subcategory (best-effort related-template hint).

Coverage: 4 hand-curated + 1329 bootstrapped = **1333 / 1333 templates (100%)**.

### Tooling

Adds `scripts/bootstrap-linguistic-hints.mjs` so the same pass can be re-run idempotently when new templates are added in future minor versions.

### Why

The Entity Linker (Layer 1, next phase) walks `linguisticHints.triggers` first and falls back to `altLabels` only when the field is absent. With ~99.7% of templates missing the field, the linker would have to branch per-template, hurting latency and making disambiguation logic harder to reason about. A present-everywhere floor unlocks cleaner downstream code now and leaves the enrichment (antiTriggers, richer adjacentTemplates) to domain-expert PRs per category.

## [1.11.0] — 2026-04-20

Final gap-fill + publication planning.

### Added — 9 new subcategories / +31 templates

**Food cuisines (+5):** czech-restaurant, portuguese-restaurant, austrian-restaurant, russian-restaurant, bavarian-restaurant
**Sports (+1):** chess-club
**Childcare (+1):** doula-service
**Accommodation (+2, seasonal rentals):** beach-rental, christmas-market-stall

### Stats
- Before: 23 / 344 / 1302
- After:  **23 / 353 / 1333** (+9 subcategories / +31 templates)

### Docs
Adds `docs/mapko/taxonomy-publication-plan-adr.md` — six-phase plan for publishing the taxonomy as a real open standard (npm, resolvable URIs via `taxonomy.mapko.net`, browsable UI, JSON Schema, discoverability, maintenance cadence).

## [1.10.0] — 2026-04-20

Second gap-fill wave. Closes remaining known gaps from the kg-progress.md "known limitations" list: accommodation variants, sports/culture venues, health specializations, retail niches, media/utilities/construction. Authored by 4 parallel subagents.

### Added — 36 new subcategories / +145 templates

**Accommodation (+4):** boutique-hotel, capsule-hotel, resort, ecotourism-lodge
**Sports & Fitness (+5):** skateboarding-park, ice-skating-school, gymnastics-club, court-pitch-rental, esports-gaming-cafe
**Health (+5):** urgent-care, telehealth, mental-health-clinic, podiatrist, sports-medicine-clinic
**Entertainment (+3):** concert-hall, jazz-club, comedy-club
**Retail (+11):** hobby-shop, fabric-store, art-supply-store, stationery-shop, antique-store, pawnshop, thrift-store, outdoor-gear-store, farmers-market, flea-market, ski-rental
**IT & Digital — media/telecom (+4):** newspaper-magazine, radio-station, tv-station, cable-tv
**Logistics (+2):** water-supply, courier-bike
**Home Services (+2):** road-construction, glazier

### Stats
- Before: 23 / 308 / 1157
- After:  **23 / 344 / 1302** (+36 subcategories / +145 templates)

### Remaining known gaps (for v1.11+ or data-validated pass)
Cuisines: czech, portuguese, austrian, russian, bavarian
Seasonal: christmas-market-vendor, beach-rental
Misc: chess-club, doula-service, mommy-meetups

## [1.9.0] — 2026-04-20

Gap-fill pass after 1000-milestone review. Adds industrial / transport / auto / construction / media / cuisine / professional domains that were missing or under-represented.

### Added

**Manufacturing (+8 sub / +32 tpl):** shipyard, aerospace-manufacturing, rail-vehicle-manufacturing, chemical-manufacturing, pharma-manufacturing, paper-mill, foundry, electronics-manufacturing

**Logistics (+7 sub / +28 tpl):** airline, shipping-line, rail-freight, port-services, airport-services, waste-management, recycling-center

**Auto & Transport (+4 sub / +17 tpl):** car-dealership, used-car-dealer, motorcycle-dealer, motorcycle-repair

**Home Services (+6 sub / +24 tpl):** roofing-contractor, concrete-contractor, demolition-service, excavation-service, solar-installer, handyman

**Food & Beverage cuisines (+6 sub / ~18 tpl):** halal-restaurant, kosher-restaurant, polish-restaurant, spanish-restaurant, bbq-joint, all-you-can-eat (buffet)

**IT & Digital media/telecom (+5 sub / ~20 tpl):** book-publisher, film-production, podcast-studio, isp, mobile-carrier

**Professional Services (+4 sub / +16 tpl):** coworking-space, business-coach, life-coach, payroll-service

### Stats
- Before: 23 / 268 / 1000
- After:  **23 / 308 / 1157** (+40 subcategories / +157 templates)

### Note on coverage honesty
This batch explicitly addresses known gaps identified during v1.8.0 review (shipyards, car dealerships, airlines, waste management, cuisines, media). See [kg-progress.md](../../docs/mapko/kg-progress.md) "Coverage validation — known limitations" section for a full, updated status of opinionated vs data-validated coverage.

## [1.8.0] — 2026-04-20

🎯 **1000-template milestone reached** (P2 ADR success metric met).

Polish pass adding cuisine restaurant variants, expanded templates across popular subcategories, and final nudge to cross the 1000-template threshold.

### Added

**Cuisines — 15 new restaurant subcategories in food-beverage.json** (+60 templates):
italian-restaurant, indian-restaurant, georgian-restaurant, turkish-restaurant, mediterranean-restaurant, french-restaurant, mexican-restaurant, greek-restaurant, lebanese-restaurant, american-diner, vietnamese-restaurant, japanese-restaurant (complements existing sushi-bar), korean-restaurant, thai-restaurant, chinese-restaurant. All use `osmTag: amenity=restaurant`, `naceRef: I56.10`, `schemaOrgType: Restaurant`.

**Template expansion across popular existing subcategories** (+59 templates):
- `tutoring` +5: english-tutoring-class, language-tutoring-class, programming-tutoring, chess-tutoring, music-theory-tutoring
- `lawyer` +5: family-law-case, corporate-law-case, immigration-law-case, criminal-defense-case, personal-injury-case
- `gym` +4: guest-pass, corporate-membership, student-discount, family-pass
- `swimming-pool` +3: aqua-aerobics, lap-lanes, kids-pool-session
- `dentist` +3: pediatric-dentistry, orthodontics, cosmetic-dentistry
- `grocery` +4: organic-produce, specialty-imports, bulk-foods, local-farm-share
- `wine-shop` +3: vintage-wine, champagne-selection, whiskey-selection
- `clothing` +4: formal-wear, sportswear-section, plus-size-clothing, sustainable-clothing
- `bakery` +3: artisan-bread, gluten-free-bakery, sourdough-bread
- `spa-massage` +3: thai-massage, lymphatic-massage, sports-massage
- `ukrainian-restaurant` +3: salo-platter, banosh, deruny
- `cafe` +5: brunch-plate, avocado-toast, kids-meal-cafe, hot-chocolate, matcha-latte
- `fast-food` +4: chicken-nuggets, hot-dog, fries-meal, fried-chicken
- `bar-pub` +3: happy-hour, karaoke-night, sports-screening
- `jewelry` +4: wedding-rings, watches-section, pearls-collection, diamond-grading
- `optician` +3: contact-lenses, sunglasses, eyewear-repair

### Stats
- Before: 23 / 253 / 881
- After:  **23 / 268 / 1000** ✨ (+15 subcategories / +119 templates)
- Progress to 1000-template target: **100%** 🎯

## [1.7.0] — 2026-04-20

P2 Coverage Expansion — Batch 6 (long tail across existing categories — final batch). See [taxonomy-coverage-expansion-adr.md](../docs/mapko/taxonomy-coverage-expansion-adr.md).

Closes the P2 wave. Adds niche sub-categories within 8 existing root categories. Authored in parallel by 5 independent subagents (one agent handled multiple related categories).

### Added — 41 new subcategories across 8 existing roots

**Health & Medical** +5: rehabilitation-center, addiction-recovery, hospice, pain-management, fertility-clinic
**Sports & Fitness** +7: pilates-studio, climbing-gym, tennis-club, golf-club, paintball-field, karting-track, equestrian-club
**Entertainment & Leisure** +8: vr-room, board-game-cafe, billiard-hall, water-park, zoo, museum, planetarium, ice-rink
**Home Services** +5: hvac, smart-home-installer, security-installer, pool-service, pest-control
**Auto & Transport** +3: gas-station, ev-charging, car-detailing-spec
**Professional Services** +6: hr-consulting, recruitment-agency, market-research, copywriting, mystery-shopping, telemarketing
**IT & Digital** +3: ai-ml-consulting, devops, blockchain-dev
**Finance & Insurance** +4: crypto-exchange, accounting-outsourcing, payday-loan, credit-counseling

### Stats
- Before: 23 / 212 / 704
- After:  **23 / 253 / 881** (+0 categories / +41 subcategories / +177 templates)

### P2 wave summary (v1.2.0 → v1.7.0)
- Categories: 14 → 23 (+9 new roots: Agriculture, Manufacturing, Logistics, Pet Services, Childcare, Events, Arts & Handmade, Real Estate, Government)
- Subcategories: 86 → 253 (+167)
- Templates: 289 → 881 (+592)
- Progress to 1000-templates target: **88%**

## [1.6.0] — 2026-04-20

P2 Coverage Expansion — Batch 5 (NEW root categories: Arts & Handmade, Real Estate, Government & Public Services). See [taxonomy-coverage-expansion-adr.md](../docs/mapko/taxonomy-coverage-expansion-adr.md).

### Added — 3 new root categories

**🎨 Arts & Handmade** (NACE C32+R90) — 9 subcategories, 31 templates:
pottery-studio, glass-studio, sculpture-studio, jewelry-artisan, leather-workshop, fine-art-gallery (Schema.org `ArtGallery`), artist-studio, framing-service, antiques-restoration. Cross-links to retail's custom-jewelry.

**🏘️ Real Estate** (NACE L68+F41) — 8 subcategories, 32 templates:
property-management, building-company, property-developer, surveyor, home-staging, mortgage-broker, property-valuator, leasing-agency. Complements existing real-estate-agent in professional/.

**⚖️ Government & Public Services** (NACE O84+R91) — 9 subcategories, 34 templates:
municipal-office, post-office, social-services, employment-center, registry-office, library, public-archives, tax-office, passport-office. Mostly civic discovery surface, not Botyard tenant targets.

### Stats
- Before: 20 / 186 / 608
- After:  **23 / 212 / 704** (+3 categories / +26 subcategories / +96 templates)

### Note
Three categories authored in parallel by independent contributors (subagents).

## [1.5.0] — 2026-04-20

P2 Coverage Expansion — Batch 4 (NEW root categories: Pet Services, Childcare, Events). See [taxonomy-coverage-expansion-adr.md](../docs/mapko/taxonomy-coverage-expansion-adr.md).

### Added — 3 new root categories

**🐾 Pet Services** (NACE M75+S96.09) — 8 subcategories, 27 templates:
pet-daycare, dog-walking, pet-training, pet-sitting, dog-grooming-salon (separate from pet-shop's grooming, with crossLinks), kennel, cat-hotel, pet-photography

**👶 Childcare & Kids** (NACE Q88.91+P85.10) — 9 subcategories, 33 templates:
babysitter, nanny-agency, kids-party-planner, kids-photo-studio, baby-massage, breastfeeding-consultant, prenatal-courses, kids-developmental-center, kids-club

**🎁 Events & Wedding** (NACE N82.30) — 11 subcategories, 42 templates:
wedding-planner, event-production, dj-service, balloon-decoration, photo-booth, mc-host, sound-rental, lighting-rental, stage-rental, fireworks, decoration-florals (crossLinks to wedding-floristry in retail/florist)

### Stats
- Before: 17 / 158 / 506
- After:  **20 / 186 / 608** (+3 categories / +28 subcategories / +102 templates)

### Note
Three categories authored in parallel by independent contributors (subagents).

## [1.4.0] — 2026-04-20

P2 Coverage Expansion — Batch 3 (NEW root categories: Agriculture, Manufacturing, Logistics). See [taxonomy-coverage-expansion-adr.md](../docs/mapko/taxonomy-coverage-expansion-adr.md).

### Added — 3 new root categories

**🌾 Agriculture & Farming** (NACE A01) — 8 subcategories, 25 templates:
crop-farm, livestock-farm, dairy-farm, beekeeping, vineyard, orchard, greenhouse, fish-farm

**🏭 Manufacturing & Production** (NACE C) — 7 subcategories, 24 templates:
food-production, textile-production, woodworking, metalworking, 3d-printing-service, candle-soap-maker, brewery-production (B2B side, crossLinks to consumer-facing craft-brewery)

**🚛 Logistics & Warehousing** (NACE H49+H52+H53) — 8 subcategories, 26 templates:
courier, parcel-locker, freight-forwarder, customs-broker, self-storage, taxi, bus-charter, truck-rental

### Stats
- Before: 14 / 135 / 430
- After:  **17 / 158 / 506** (+3 categories / +23 subcategories / +75 templates)

### Note
Three categories were authored in parallel by independent contributors and merged into a single release.

## [1.3.0] — 2026-04-20

P2 Coverage Expansion — Batch 2 (Health & Beauty specialization). See [taxonomy-coverage-expansion-adr.md](../docs/mapko/taxonomy-coverage-expansion-adr.md).

### Added
- **Health & Medical** +15 subcategories:
  - Specialist physicians: cardiologist, gynecologist, urologist, neurologist, ent-doctor, gastroenterologist, endocrinologist, pediatrician
  - Diagnostics: medical-lab, imaging-center
  - Allied health: nutritionist, chiropractor, osteopath, speech-therapist, home-care
- **Beauty & Wellness** +5 subcategories:
  - lash-extensions-studio, brow-bar, permanent-makeup, depilation-lounge, cosmetology-clinic
- ~64 new templates including ECG, MRI, colonoscopy, microblading, laser hair removal, botox, fillers, mesotherapy

### Stats
- Before: 14 / 115 / 366
- After:  **14 / 135 / 430** (+20 subcategories / +64 templates)

## [1.2.0] — 2026-04-20

P2 Coverage Expansion — Batch 1 (Food & Retail density). See [taxonomy-coverage-expansion-adr.md](../docs/mapko/taxonomy-coverage-expansion-adr.md).

### Added
- **Food & Beverage** +14 subcategories: pizzeria, sushi-bar, burger-joint, vegan-restaurant, confectionery, wine-bar, craft-brewery, tea-house, food-truck, juice-bar, kebab, asian-restaurant, ukrainian-restaurant, seafood-restaurant
- **Retail & Shopping** +15 subcategories: bookstore, toy-store, sports-equipment, kids-clothing, lingerie, furniture-store, hardware-store, wine-shop, tobacco-shop, mobile-shop, bicycle-shop, gift-shop, music-instruments, comic-game-shop, wedding-store
- ~77 new templates (3 per new subcategory on average)
- All new entries follow v1.1.0 schema: @id, names (EN/UK/DE/RU), altLabels, schemaOrgType, wikidataId where exists, NACE detail code, OSM tag

### Stats
- Before: 14 / 86 / 289
- After:  **14 / 115 / 366** (+29 subcategories / +77 templates)

## [1.1.0] — 2026-04-19

### Added
- `@id` stable URIs on categories, subcategories, and templates under `https://taxonomy.mapko.net/v1/`
- JSON-LD `@context` file (`context.jsonld`) mapping fields to SKOS and Schema.org
- `schemaOrgType` on subcategories (Schema.org LocalBusiness subtypes — HairSalon, BeautySalon, Restaurant, Hotel, Pharmacy, etc.)
- `wikidataId` on subcategories and most templates for cross-lingual anchoring
- `altLabels` (EN/UK/DE/RU) for entity-linking synonyms
- Detailed `naceRef` codes at subcategory level (NACE Rev.2)
- `attributes.required` / `attributes.optional` / `attributes.schema` on templates (P1 feature, blueprint examples in beauty-wellness and food-beverage)
- `linguisticHints.triggers` / `antiTriggers` / `adjacentTemplates` for LLM classifier
- `crossLinks` DAG between related templates
- `expectedRelations` on subcategories as relation-hint for Layer 1 entity linker
- `VERSION` file and this CHANGELOG
- `taxonomy.jsonld` single-file export generated from per-category files (`scripts/build-jsonld.mjs`)
- Validator script (`scripts/validate.mjs`) — required-field + slug-uniqueness + language-coverage checks
- npm package metadata (`@mapko/nace-osm-taxonomy`) with TypeScript types and lookup helpers

### Changed
- All 14 categories migrated to v1.1.0 schema
- Fixed Ukrainian apostrophe escaping (`\\'` → `'`) in beauty-wellness, food-beverage, health, crafts-repair

### Compatibility
- All changes are additive — existing consumers of v1.0.0 continue to work without modification

### Coverage notes
- Wikidata QIDs: ~95% of subcategories, ~50% of templates (skipped where no clear QID exists)
- Schema.org types: 100% of subcategories use a LocalBusiness subtype where one exists (else fall back to ProfessionalService / EntertainmentBusiness / etc.)
- NACE Rev.2 detail codes: 100% of subcategories
- attribute schemas + linguistic hints: only on representative ambiguous templates (beauty-wellness, food-beverage business-lunch); to be expanded in P1 follow-up

## [1.0.0] — 2026-04-18

### Added
- Initial public release
- 14 root categories, ~80 subcategories, ~300 service templates
- NACE Rev.2 section codes at category level
- OSM tags at subcategory level
- Translations: EN, UK, DE, RU
- MIT license
