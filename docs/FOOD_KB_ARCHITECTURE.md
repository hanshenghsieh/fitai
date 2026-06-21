# Taiwan Food Knowledge Graph

Food data is a moat. This system collects, normalizes, cross-validates, and incrementally expands Taiwan food coverage from **every public source**.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CRAWLER LAYER                           │
│  legacy-menu · 7-11 · OpenFoodFacts · menu-ocr · [future]   │
│  UberEats · Foodpanda · Google Maps · Dcard · PTT · blogs   │
└──────────────────────────┬──────────────────────────────────┘
                           │ RawFoodObservation[]
┌──────────────────────────▼──────────────────────────────────┐
│                  NORMALIZATION LAYER                          │
│  normalizeFoodName · clusterKey · expandAliases · slugify     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              DEDUP + CONFIDENCE LAYER                       │
│  findBestMatch · crossValidateNutrition · SOURCE_TRUST       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              KNOWLEDGE GRAPH (incremental)                  │
│  brands → clusters → items → observations → ingredients     │
│  Local: data/food-kb/graph.json                             │
│  DB:    supabase-migrations/003-food-knowledge-graph.sql    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              QA + COVERAGE                                  │
│  coverage-report · missing-foods · stale detection          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              RUNTIME EXPORT                                 │
│  runtime-menu.json → sync-menu.mjs → convenience-store-menu  │
└─────────────────────────────────────────────────────────────┘
```

## Data model

| Entity | Purpose |
|--------|---------|
| `kb_brands` | 7-11, 五十嵐, 麥當勞… |
| `kb_food_clusters` | Canonical food + synonym hub (大冰奶 = 冰奶茶) |
| `kb_food_aliases` | All name variants |
| `kb_food_items` | Store-specific SKU with nutrition |
| `kb_observations` | Every raw crawl — never deleted |
| `kb_sources` | Provenance + trust weight |
| `kb_ingredients` | Ingredient graph (future) |
| `kb_coverage_gaps` | Missing food tracker |

## Confidence scoring

Never trust one source. Base trust by source type:

| Source | Trust |
|--------|-------|
| official_website | 0.95 |
| tfda_open_data | 0.92 |
| open_food_facts | 0.85 |
| ubereats / foodpanda | 0.75 |
| blog | 0.60 |
| menu_ocr | 0.55 |
| community (Dcard/PTT) | 0.45–0.50 |
| estimated | 0.35 |

+0.05 per agreeing source (within 10% on calories)  
−0.10 per major nutrition conflict

## Category-based expansion (recommended workflow)

Build **one category at a time** — never crawl everything at once.

```bash
# 1. Generate seeds for one category
npm run food-kb:build-seeds -- --category bubbletea

# 2. Ingest into knowledge graph
npm run food-kb:sync -- --category bubbletea

# 3. Full rebuild (all 17 categories)
npm run food-kb:full

# 4. Progress dashboard
npm run food-kb:dashboard
```

### Registered categories (150 brands)

`convenience` · `breakfast` · `coffee` · `bubbletea` · `fastfood` · `japanese` · `bento` · `hotpot` · `bbq` · `noodles` · `thai` · `korean` · `american` · `healthy` · `desserts` · `supermarket` · `night_market`

Brand registry: `src/lib/food-kb/brand-registry.ts`  
Menu templates: `scripts/food-kb/seed-templates.ts`  
Generated seeds: `scripts/food-kb/seeds/generated/{category}.json`

## Commands

```bash
# Full incremental sync (legacy + 7-11 scrape + OpenFoodFacts)
npm run food-kb:sync

# Specific adapters
npm run food-kb:sync -- --adapters legacy-menu,seven-eleven

# Coverage dashboard
npm run food-kb:coverage

# Export to runtime JSON
npm run food-kb:export
```

## Adding a crawler

1. Create `scripts/food-kb/crawlers/my-source.ts`
2. Implement `FoodCrawler` interface → return `RawFoodObservation[]`
3. Register in `crawlers/registry.ts`
4. Run pipeline — graph merges incrementally, never rebuilds

## Planned adapters (architecture ready)

| Adapter | Source | Status |
|---------|--------|--------|
| `legacy-menu` | Existing 1082-item TS menu | ✅ |
| `chain-expansion` | Subway、爭鮮、點點心、百貨美食街 | ✅ |
| `seven-eleven` | 7-11.com.tw scrape | ✅ |
| `open-food-facts` | OFF Taiwan products API | ✅ |
| `menu-ocr` | Photo menu extraction | 🔧 stub |
| `familymart` | FamilyMart official | 📋 planned |
| `tfda-open-data` | Taiwan FDA nutrition DB | 📋 planned |
| `ubereats` | Delivery menus | 📋 planned |
| `foodpanda` | Delivery menus | 📋 planned |
| `google-maps` | POI + review menu photos | 📋 planned |
| `dcard` / `ptt` | Community mentions | 📋 planned |
| `ifoodie` / `openrice` | Restaurant reviews | 📋 planned |

## Synonym examples

```
大冰奶 · 冰奶茶 · 冰奶 · 大杯奶茶  →  same cluster
珍珠奶茶 · 波霸奶茶 · 粉圓奶茶      →  same cluster
滷肉飯 · 魯肉飯                    →  same cluster
```

## Principles

1. **Coverage > perfection** — missing foods are worse than imperfect estimates
2. **Never rebuild** — append observations, merge clusters
3. **Never trust one source** — cross-validate always
4. **Track provenance** — every calorie has a source chain
5. **Continuous expansion** — pipeline runs daily via cron

## Database migration

```sql
-- Run in Supabase SQL Editor after schema.sql
\i supabase-migrations/003-food-knowledge-graph.sql
```

## Integration with app

Runtime search still uses `convenience-store-menu.ts`. After pipeline:

```bash
npm run food-kb:export   # → data/food-kb/runtime-menu.json
# Future: sync-menu.mjs merges runtime-menu.json into TS export
```

Long-term: `food-search.ts` queries Supabase `kb_food_items` with trigram index.
