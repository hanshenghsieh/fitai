# Search Alias Report

**Generated:** Beta Readiness Sprint  
**Engine:** `src/lib/nutrition/alias-engine/`

## Stats

| Metric | Value |
|--------|-------|
| Official entries | 345 |
| Total alias tokens | 1,327 |
| Min required | 500+ |

## Rules

- Any alias resolves to **one** official item
- No AI guessing — exact index lookup only
- No duplicate alias → multiple officials
- Wired into `food-menu-lookup.ts` via `resolveAliasQuery` + `expandQueryWithAliases`

## Examples

| Alias | Official |
|-------|----------|
| 香雞排、豪大雞排 | 雞排系列 / menu item |
| SUBWAY、潛艇堡 | Subway 品項 |
| 711竹筍排骨湯 | 7-11 竹筍排骨湯 |
| 魯肉飯 | 滷肉飯 |

## Regenerate

```bash
npm run alias:generate
```
