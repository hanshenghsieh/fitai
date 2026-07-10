# Release Gate Report

Generated: 2026-07-10T09:22:18.914Z

## Verdict: **PASS** — automated gate clear

> 2 optional step(s) skipped or warned — see below.

## Steps

| Step | Status | Time |
|------|--------|------|
| Unit tests (npm test) | ✅ pass | 199696ms |
| Regression unit tests | ✅ pass | 6845ms |
| E2E coverage scan | ✅ pass | 851ms |
| Button registry scan (warn only) | ⚠️ warn | 880ms |
| Food log persist E2E | ⚠️ warn | 0ms |

## Required before TestFlight handoff

- [ ] `npm run qa:release-gate` — all required steps green
- [ ] Manual TestFlight: IAP subscribe + restore + reinstall
- [ ] Manual: delete meal → switch tab → return (if E2E skipped)

## Env for full E2E

```bash
BB_E2E_EMAIL=your@test.com BB_E2E_PASSWORD=secret npm run qa:release-gate
```
