# NACE-OSM Service Taxonomy

An open, multilingual (EN/UK/DE/RU) business service taxonomy that maps **NACE Rev.2** statistical codes to **OpenStreetMap** community tags, enriched with **service templates** for marketplace use.

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
| Root categories | 14 |
| Subcategories | ~80 |
| Service templates | ~300 |
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

## File structure

```
nace-osm-taxonomy/
├── taxonomy.json              # Complete taxonomy in a single file
├── categories/                # Individual category files
│   ├── food-beverage.json
│   ├── accommodation.json
│   ├── retail.json
│   ├── beauty-wellness.json
│   ├── health.json
│   ├── education.json
│   ├── auto-transport.json
│   ├── home-services.json
│   ├── professional.json
│   ├── it-digital.json
│   ├── sports-fitness.json
│   ├── entertainment.json
│   ├── finance.json
│   └── crafts-repair.json
├── README.md
└── LICENSE
```

## Data format

Each category file is a JSON object:

```json
{
  "slug": "beauty-wellness",
  "names": {
    "en": "Beauty & Wellness",
    "uk": "Краса та здоров'я",
    "de": "Schönheit & Wellness",
    "ru": "Красота и здоровье",
    "original": "Beauty & Wellness"
  },
  "icon": "💇",
  "naceRef": "S96",
  "subcategories": [
    {
      "slug": "hair-salon",
      "names": {
        "en": "Hair Salon",
        "uk": "Перукарня",
        "de": "Friseursalon",
        "ru": "Парикмахерская",
        "original": "Hair Salon"
      },
      "osmTag": "shop=hairdresser",
      "templates": [
        {
          "slug": "womens-haircut",
          "names": {
            "en": "Women's Haircut",
            "uk": "Жіноча стрижка",
            "de": "Damenhaarschnitt",
            "ru": "Женская стрижка",
            "original": "Women's Haircut"
          }
        }
      ]
    }
  ]
}
```

## How to use

### JavaScript / TypeScript
```js
const taxonomy = require('./taxonomy.json');
const categories = taxonomy; // array of root categories

// Find all beauty subcategories
const beauty = categories.find(c => c.slug === 'beauty-wellness');
console.log(beauty.subcategories.map(s => s.names.en));
// ['Hair Salon', 'Barbershop', 'Nail Studio', ...]
```

### Python
```python
import json

with open('taxonomy.json') as f:
    taxonomy = json.load(f)

# Get all subcategories with their OSM tags
for cat in taxonomy:
    for sub in cat['subcategories']:
        print(f"{cat['icon']} {sub['names']['en']} → {sub.get('osmTag', 'N/A')}")
```

## Data sources

- **NACE Rev.2** — European statistical classification (Eurostat, public domain)
- **OSM tags** — OpenStreetMap community naming conventions (tag vocabulary, not database)
- **Service templates** — Original work by Mapko
- **Translations** — Original work by Mapko (EN, UK, DE, RU)

No data from the OpenStreetMap database (ODbL) or proprietary sources (Google, Foursquare) was used. The OSM tag names (e.g., `amenity=restaurant`) are community-agreed naming conventions, not copyrightable database content.

## Contributing

Contributions welcome! You can help by:

- Adding new subcategories or service templates
- Adding translations for more languages
- Improving existing translations
- Suggesting new root categories

## License

MIT License - Created by [Mapko](https://mapko.net)

See [LICENSE](LICENSE) for details.
