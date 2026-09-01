# Release Gate Report

Generated: 2026-09-01T04:23:20.172Z

## Verdict: **FAIL** — do not ship / do not ask user to test

> 2 optional step(s) skipped or warned — see below.

## Steps

| Step | Status | Time |
|------|--------|------|
| Unit tests (npm test) | ❌ fail | 20322ms |
| Regression unit tests | ✅ pass | 367ms |
| E2E coverage scan | ❌ fail | 108ms |
| Button registry scan (warn only) | ⚠️ warn | 103ms |
| Food log persist E2E | ⚠️ warn | 0ms |

## Required before TestFlight handoff

- [ ] `npm run qa:release-gate` — all required steps green
- [ ] Manual TestFlight: IAP subscribe + restore + reinstall
- [ ] Manual: delete meal → switch tab → return (if E2E skipped)

## Env for full E2E

```bash
BB_E2E_EMAIL=your@test.com BB_E2E_PASSWORD=secret npm run qa:release-gate
```
