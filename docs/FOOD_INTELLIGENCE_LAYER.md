# Food Intelligence Layer

> **Staging / food-kb only** — does not modify production, runtime database, or nutrition source values.

## Purpose

Upgrade BetterBit from a menu database to a **weight-loss decision layer** by attaching rule-based, explainable intelligence fields to QA-passed staging items.

## Fields

| Field | Description |
|-------|-------------|
| `popularity_score` | 0–100 ranking weight (rule-based, not default 100) |
| `meal_context` | breakfast / lunch / dinner / late_night / snack scores |
| `diet_tags` | high_protein, low_calorie, weight_loss, etc. |
| `food_category` | 主餐 / 副餐 / 飲料 / 手搖飲 / … |
| `satiety_score` | 0–100 from protein, fiber, calorie density, processing |
| `processing_level` | whole_food → ultra_processed |
| `recommended_addons` | Separate catalog items only — **not official combos** |
| `recommended_replacements` | Alternative suggestions — **does not rename original dish** |
| `recommendation_rules` | Why suitable / unsuitable for recommendation |
| `meal_graph_edges` | main→side/drink/replacement edges; D-grade blocked at runtime |

## Commands

```bash
npm run food-intelligence:layer
npm test   # includes food-intelligence tests
```

## Output

- `data/food-kb/staging/food-intelligence-manifest.json`
- `docs/FOOD_INTELLIGENCE_LAYER_REPORT.md`

## Rollback

Delete `food-intelligence-manifest.json` — no schema migration, no production impact.
