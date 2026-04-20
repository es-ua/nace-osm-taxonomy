# NACE-OSM Service Taxonomy

An open, multilingual (EN/UK/DE/RU) business service taxonomy that maps **NACE Rev.2** statistical codes to **OpenStreetMap** community tags, enriched with **service templates** for marketplace use.

Formalized as **JSON-LD** with `@id` URIs under `https://taxonomy.mapko.net/v1/`, anchored in **Schema.org** LocalBusiness types and **Wikidata** QIDs. Positioned as an Upper Ontology for SMB discovery platforms — inspired by Schema.org's `LocalBusiness` vocabulary but with deeper industry coverage (1300+ templates across 23 roots).

**Current version:** see [VERSION](./VERSION) · **Changelog:** [CHANGELOG.md](./CHANGELOG.md) · **JSON-LD context:** [context.jsonld](./context.jsonld)

## What is this?

A structured classification of businesses and their services, designed for local discovery platforms, marketplaces, and business directories.

```
NACE Section (statistical standard, EU)
  └── Subcategory (mapped to OSM tag)
        └── Service Template (typical service offered)
```

**Example:**

```
🍽️ Food & Beverage (NACE I56)
  └── Restaurant (OSM: amenity=restaurant)
        ├── Business Lunch
        ├── Banquet
        ├── Takeaway
        ├── Delivery
        └── Catering
```

## Stats

| Metric | Count |
|--------|-------|
| Root categories | 23 |
| Subcategories | 353 |
| Service templates | 1333 |
| Languages | 4 (EN, UK, DE, RU) |

## Categories

| Icon | Category | NACE Code | Subcategories |
|------|----------|-----------|---------------|
| 🍽️ | Food & Beverage | I56 | Restaurant, Cafe, Bar, Fast Food, Bakery, Ice Cream |
| 🏨 | Accommodation | I55 | Hotel, Hostel, Guest House, Apartment Rental |
| 🛍️ | Retail & Shopping | G47 | Grocery, Clothing, Electronics, Florist, Pharmacy, Jewelry, Optician |
| 💇 | Beauty & Wellness | S96 | Hair Salon, Barbershop, Nail Studio, Spa, Beauty Salon, Tattoo |
| 🏥 | Health & Medical | Q86 | General Doctor, Dentist, Physiotherapy, Psychologist, Veterinary |
| 🎓 | Education & Training | P85 | Language School, Driving School, Music, Tutoring, Dance, Art |
| 🚗 | Auto & Transport | G45+H49 | Car Repair, Car Wash, Tire Service, Car Rental |
| 🏠 | Home Services | F43+N81 | Plumber, Electrician, Cleaning, Landscaping, Moving, Locksmith |
| 💼 | Professional Services | M69-M74 | Lawyer, Accountant, Notary, Architect, Real Estate, Translator |
| 💻 | IT & Digital | J62 | Web Dev, Mobile Dev, IT Consulting, SEO, Design, Photography |
| 🏋️ | Sports & Fitness | R93 | Gym, Yoga, Swimming, Martial Arts, Personal Trainer |
| 🎭 | Entertainment & Leisure | R90+R92 | Cinema, Theater, Nightclub, Bowling, Escape Room, Event Venue |
| 🏦 | Finance & Insurance | K64-K66 | Bank, Currency Exchange, Financial Advisor, Insurance |
| 🔧 | Crafts & Repair | S95+C | Phone Repair, Computer Repair, Tailor, Shoe Repair, Watch Repair |
| 🌾 | Agriculture & Farming | A01 | Crop Farm, Livestock, Dairy, Beekeeping, Vineyard, Orchard, Greenhouse, Fish Farm |
| 🏭 | Manufacturing & Production | C | Food Production, Textile, Woodworking, Metalworking, 3D Printing, Candle/Soap, Brewery |
| 🚛 | Logistics & Warehousing | H49+H52+H53 | Courier, Parcel Locker, Freight Forwarder, Customs Broker, Self-Storage, Taxi, Bus Charter, Truck Rental |
| 🐾 | Pet Services | M75+S96.09 | Pet Daycare, Dog Walking, Pet Training, Pet Sitting, Grooming Salon, Kennel, Cat Hotel, Pet Photography |
| 👶 | Childcare & Kids | Q88.91+P85.10 | Babysitter, Nanny Agency, Kids Parties, Kids Photo, Baby Massage, Lactation Consultant, Prenatal, Kids Dev Center, Kids Club |
| 🎁 | Events & Wedding | N82.30 | Wedding Planner, Event Production, DJ, Balloon Decor, Photo Booth, MC, Sound/Lighting/Stage Rental, Fireworks, Florals |
| 🎨 | Arts & Handmade | C32+R90 | Pottery, Glass, Sculpture, Jewelry Artisan, Leather, Art Gallery, Artist Studio, Framing, Antiques Restoration |
| 🏘️ | Real Estate | L68+F41 | Property Management, Building Co., Developer, Surveyor, Home Staging, Mortgage Broker, Valuator, Leasing |
| ⚖️ | Government & Public | O84+R91 | Municipal, Post Office, Social Services, Employment, Registry, Library, Archives, Tax, Passport |

## Install

```bash
npm install @mapko/nace-osm-taxonomy
```

Then in Node / TypeScript:

```ts
import {
  loadTaxonomy,
  findSubcategoryBySlug,
  findByOsmTag,
  findByNaceRef,
  findByWikidataId,
} from '@mapko/nace-osm-taxonomy';

const taxonomy = loadTaxonomy();
const hairSalon = findSubcategoryBySlug('hair-salon');
const restaurants = findByOsmTag('amenity=restaurant');
```

Or consume JSON directly (any language):

```ts
import taxonomy from '@mapko/nace-osm-taxonomy/taxonomy.jsonld';
import beauty from '@mapko/nace-osm-taxonomy/categories/beauty-wellness.json';
```

## How to use

### JavaScript / TypeScript
```js
const taxonomy = require('./taxonomy.json');
const categories = taxonomy;

const beauty = categories.find(c => c.slug === 'beauty-wellness');
console.log(beauty.subcategories.map(s => s.names.en));
```

### Python
```python
import json
with open('taxonomy.json') as f:
    taxonomy = json.load(f)
for cat in taxonomy:
    for sub in cat['subcategories']:
        print(f"{cat['icon']} {sub['names']['en']} → {sub.get('osmTag', 'N/A')}")
```

## Data format

Each category file is a JSON object. Since v1.1.0 it carries additional fields for use as an ontology (URIs, Schema.org / Wikidata links, attribute schemas, linguistic hints). All new fields are **additive** — old consumers of v1.0.0 continue to work.

See `categories/beauty-wellness.json` for a fully-enriched blueprint.

### Field reference (v1.1.0)

| Field | Level | Purpose |
|---|---|---|
| `@id` | all | stable URI for cross-reference from downstream graphs |
| `@context` | root | JSON-LD context (points to `context.jsonld`) |
| `altLabels` | category/sub/template | synonyms per language, critical for entity linking |
| `schemaOrgType` | subcategory | Schema.org LocalBusiness subtype for LD-JSON export |
| `wikidataId` | subcategory/template | Wikidata QID for cross-lingual / cross-system reference |
| `naceRef` | any | NACE Rev.2 code |
| `osmTag` | subcategory/template | OSM tag at the most specific applicable level |
| `attributes.{required,optional,schema}` | template | typed schema for instances (price, duration, enums) |
| `expectedRelations` | subcategory | relation hints for downstream entity linker |
| `linguisticHints.{triggers,antiTriggers,adjacentTemplates}` | template | LLM classifier disambiguation hints |
| `crossLinks` | template | DAG edges between related templates |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Attribution

Inspired by and anchored in public industry standards:

- **NACE Rev.2** (Eurostat, public domain) — statistical classification backbone
- **OpenStreetMap tag conventions** — community naming vocabulary for geo-tagging
- **Schema.org** LocalBusiness vocabulary ([CC-BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)) — type mappings
- **Wikidata** QIDs ([CC0](https://creativecommons.org/publicdomain/zero/1.0/)) — cross-lingual anchors

No proprietary taxonomy content from Foursquare, Google My Business, Yelp, or any closed commercial source was imported or copied.

## License

MIT License — Created by [Mapko](https://mapko.net)

See [LICENSE](./LICENSE) for details.
