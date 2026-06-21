# Market Reality Loop

Permanent product process — **not a one-time report**.

## When to run

After every **major product change**:

```bash
npm run market-loop
```

Outputs land in `docs/market-loop/` and raw data in `data/market-loop/`.

## What it does

1. Generates **500 messy Taiwan-market character cards** (not ideal users)
2. Simulates **D1 → D180** with life events, competitors, friction
3. Runs **adversarial expert board** (must disagree)
4. Writes retention / conversion / trust / friction / competitor / founder-bias reports
5. Proposes **P0 / P1 / P2** changes with threshold rules:
   - 5 users → record
   - 50 → investigate
   - 100 → redesign
   - 200 → product is wrong

## After each run

1. Read `P0_CHANGES.md` and implement market-fitness fixes
2. Update `scripts/market-loop/product-model.ts` to match shipped product
3. Re-run the loop until no **obvious** major blocker remains

## Core question

> If 10,000 real users joined tomorrow, how would BetterBit die?

Find it. Fix it. Run again. **Reality is CEO.**
