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

| Icon | Category | NACE | Subs | Templates |
|------|----------|------|------|-----------|
| 🍽️ | [Food & Beverage](#-food--beverage--nace-i56) | I56 | 6 | 23 |
| 🏨 | [Accommodation](#-accommodation--nace-i55) | I55 | 4 | 11 |
| 🛍️ | [Retail & Shopping](#-retail--shopping--nace-g47) | G47 | 8 | 17 |
| 💇 | [Beauty & Wellness](#-beauty--wellness--nace-s96) | S96 | 7 | 28 |
| 🏥 | [Health & Medical](#-health--medical--nace-q86) | Q86 | 7 | 21 |
| 🎓 | [Education & Training](#-education--training--nace-p85) | P85 | 7 | 21 |
| 🚗 | [Auto & Transport](#-auto--transport--nace-g45h49) | G45+H49 | 4 | 14 |
| 🏠 | [Home Services](#-home-services--nace-f43n81) | F43+N81 | 8 | 25 |
| 💼 | [Professional Services](#-professional-services--nace-m69-m74) | M69-M74 | 6 | 17 |
| 💻 | [IT & Digital](#-it--digital--nace-j62) | J62 | 7 | 22 |
| 🏋️ | [Sports & Fitness](#-sports--fitness--nace-r93) | R93 | 5 | 15 |
| 🎭 | [Entertainment & Leisure](#-entertainment--leisure--nace-r90r92) | R90+R92 | 6 | 14 |
| 🏦 | [Finance & Insurance](#-finance--insurance--nace-k64-k66) | K64-K66 | 4 | 10 |
| 🔧 | [Crafts & Repair](#-crafts--repair--nace-s95c) | S95+C | 7 | 23 |

---

## Full Taxonomy

### 🍽️ Food & Beverage · NACE I56

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Restaurant | `amenity=restaurant` | Business Lunch · Banquet · Takeaway · Delivery · Catering |
| Cafe | `amenity=cafe` | Coffee & Drinks · Pastries · Breakfast Set · Lunch Menu |
| Bar & Pub | `amenity=bar` | Cocktails · Craft Beer · Hookah · Live Music Night |
| Fast Food | `amenity=fast_food` | Combo Meal · Delivery |
| Bakery | `shop=bakery` | Fresh Bread · Pastries · Custom Cake · Wedding Cake |
| Ice Cream Shop | `amenity=ice_cream` | Ice Cream Scoop · Milkshake · Sorbet |

### 🏨 Accommodation · NACE I55

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Hotel | `tourism=hotel` | Single Room · Double Room · Suite · Conference Room |
| Hostel | `tourism=hostel` | Dorm Bed · Private Room |
| Guest House | `tourism=guest_house` | Room per Night · Weekly Stay |
| Apartment Rental | `tourism=apartment` | Studio · One Bedroom · Two Bedrooms |

### 🛍️ Retail & Shopping · NACE G47

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Grocery Store | `shop=supermarket` | Home Delivery · Gift Basket |
| Clothing Store | `shop=clothes` | Personal Styling · Alterations |
| Electronics | `shop=electronics` | Device Setup · Warranty Repair |
| Florist | `shop=florist` | Bouquet · Wedding Floristry · Flower Subscription |
| Pet Shop | `shop=pet` | Pet Grooming · Pet Food Delivery |
| Pharmacy | `amenity=pharmacy` | Prescription · Consultation |
| Jewelry | `shop=jewelry` | Custom Design · Repair · Engraving |
| Optician | `shop=optician` | Eye Exam · Lens Fitting · Frame Adjustment |

### 💇 Beauty & Wellness · NACE S96

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Hair Salon | `shop=hairdresser` | Women's Haircut · Men's Haircut · Hair Coloring · Highlights · Blow Dry · Hair Treatment |
| Barbershop | `shop=hairdresser` | Haircut · Beard Trim · Hot Towel Shave · Head Shave |
| Nail Studio | `shop=beauty` | Manicure · Pedicure · Gel Nails · Nail Art |
| Spa & Massage | `shop=massage` | Swedish Massage · Deep Tissue Massage · Hot Stone Massage · Facial · Body Wrap |
| Beauty Salon | `shop=beauty` | Facial Treatment · Eyebrow Shaping · Eyelash Extensions · Waxing · Makeup |
| Tattoo & Piercing | `shop=tattoo` | Small Tattoo · Large Tattoo · Piercing · Tattoo Removal |
| Tanning Studio | `leisure=tanning_salon` | Tanning Session · Spray Tan |

### 🏥 Health & Medical · NACE Q86

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| General Practitioner | `healthcare=doctor` | Consultation · Check-up · Vaccination · Blood Test |
| Dentist | `healthcare=dentist` | Cleaning · Filling · Extraction · Whitening · Dental Implant · Crown |
| Physiotherapy | `healthcare=physiotherapist` | Session · Assessment · Manual Therapy · Sports Rehab |
| Psychologist | `healthcare=psychologist` | Individual Session · Couples Therapy · Assessment |
| Veterinary | `amenity=veterinary` | Consultation · Vaccination · Surgery · Grooming |
| Ophthalmologist | `healthcare=doctor` | Eye Exam · Laser Consultation |
| Dermatologist | `healthcare=doctor` | Consultation · Skin Check · Acne Treatment · Mole Removal |

### 🎓 Education & Training · NACE P85

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Language School | `amenity=language_school` | Group Lesson · Private Lesson · Intensive Course · Exam Preparation |
| Driving School | `amenity=driving_school` | Theory Lesson · Practical Lesson · Exam Preparation |
| Music School | `amenity=music_school` | Individual Lesson · Group Lesson · Instrument Rental |
| Tutoring | `office=tutoring` | Math · Science · Exam Preparation |
| Dance School | `leisure=dance` | Trial Lesson · Monthly Pass · Private Lesson · Workshop |
| Art School | `amenity=school` | Drawing Class · Painting Class · Pottery Class |
| Kindergarten | `amenity=kindergarten` | Full Day · Half Day · After School |

### 🚗 Auto & Transport · NACE G45+H49

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Car Repair | `shop=car_repair` | Oil Change · Brake Service · Diagnostics · Inspection (TÜV) |
| Car Wash | `amenity=car_wash` | Exterior Wash · Interior Cleaning · Full Detailing |
| Tire Service | `shop=tyres` | Tire Change · Wheel Balancing · Wheel Alignment · Tire Storage |
| Car Rental | `amenity=car_rental` | Daily Rental · Weekly Rental · Monthly Rental |

### 🏠 Home Services · NACE F43+N81

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Plumber | `craft=plumber` | Repair · Installation · Emergency Call · Drain Cleaning |
| Electrician | `craft=electrician` | Wiring · Repair · Installation · Inspection |
| Cleaning Service | `office=cleaning` | Regular Cleaning · Deep Cleaning · Window Cleaning · Office Cleaning |
| Landscaping | `craft=gardener` | Lawn Care · Tree Trimming · Garden Design |
| Moving Service | `office=moving_company` | Local Move · Long Distance · Packing · Furniture Assembly |
| Locksmith | `craft=locksmith` | Lock Change · Emergency Opening · Key Copy |
| Painter | `craft=painter` | Interior · Exterior · Wallpaper |
| Renovation | `craft=builder` | Bathroom · Kitchen · Full Renovation |

### 💼 Professional Services · NACE M69-M74

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Lawyer | `office=lawyer` | Consultation · Contract Review · Court Representation |
| Accountant | `office=accountant` | Tax Return · Bookkeeping · Annual Report |
| Notary | `office=notary` | Certification · Real Estate Transaction · Will · Power of Attorney |
| Architect | `office=architect` | Consultation · Building Plan · Interior Design |
| Real Estate Agent | `office=estate_agent` | Property Valuation · Buyer Representation · Rental Management |
| Translator | `office=translator` | Document Translation · Certified Translation · Interpretation |

### 💻 IT & Digital · NACE J62

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Web Development | — | Landing Page · E-commerce Site · Web Application · Website Maintenance |
| Mobile Development | — | iOS App · Android App · Cross-platform App |
| IT Consulting | `office=it` | IT Audit · Cloud Migration · Cybersecurity Assessment |
| SEO & Marketing | — | SEO Audit · Google Ads · Social Media Management · Content Marketing |
| Graphic Design | `office=graphic_design` | Logo Design · Brand Identity · Print Design · Packaging |
| Photography | `craft=photographer` | Portrait Session · Product Photography · Event Photography · Wedding Photography |
| Videography | — | Promo Video · Event Video · Social Media Content · Drone Footage |

### 🏋️ Sports & Fitness · NACE R93

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Gym | `leisure=fitness_centre` | Monthly Pass · Day Pass · Personal Training · Group Class |
| Yoga Studio | `leisure=fitness_centre` | Drop-in Class · Monthly Unlimited · Private Session · Workshop |
| Swimming Pool | `leisure=swimming_pool` | Single Swim · Monthly Pass · Swimming Lesson |
| Martial Arts | `leisure=sports_centre` | Trial Class · Monthly Membership · Private Lesson |
| Personal Trainer | — | Single Session · Package of 10 · Nutrition Plan · Online Coaching |

### 🎭 Entertainment & Leisure · NACE R90+R92

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Cinema | `amenity=cinema` | Regular Ticket · 3D Ticket · Private Screening |
| Theater | `amenity=theatre` | Ticket · Season Pass |
| Nightclub | `amenity=nightclub` | Entry · VIP Table · Private Event |
| Bowling | `leisure=bowling_alley` | Game · Lane Rental · Party Package |
| Escape Room | `leisure=escape_game` | Room Session · Team Building |
| Event Venue | `amenity=events_venue` | Venue Rental · Wedding Package · Corporate Event |

### 🏦 Finance & Insurance · NACE K64-K66

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Bank | `amenity=bank` | Account Opening · Loan Consultation · Mortgage Consultation |
| Currency Exchange | `amenity=bureau_de_change` | Currency Exchange · Money Transfer |
| Financial Advisor | `office=financial_advisor` | Consultation · Portfolio Review · Retirement Planning |
| Insurance Agent | `office=insurance` | Consultation · Policy Review · Claim Assistance |

### 🔧 Crafts & Repair · NACE S95+C

| Subcategory | OSM Tag | Service Templates |
|-------------|---------|-------------------|
| Phone Repair | `craft=electronics_repair` | Screen Replacement · Battery Replacement · Water Damage Repair |
| Computer Repair | `craft=electronics_repair` | Diagnostic · Virus Removal · Hardware Upgrade · Data Recovery |
| Tailor | `craft=tailor` | Alteration · Custom Suit · Dress Making · Zipper Repair |
| Shoe Repair | `craft=shoemaker` | Heel Replacement · Sole Repair · Stretching · Cleaning |
| Watch Repair | `craft=watchmaker` | Battery Replacement · Repair · Restoration |
| Furniture Repair | `craft=carpenter` | Restoration · Upholstery · Custom Piece |
| Appliance Repair | `craft=electronics_repair` | Washing Machine · Refrigerator · Dishwasher · Oven |

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
