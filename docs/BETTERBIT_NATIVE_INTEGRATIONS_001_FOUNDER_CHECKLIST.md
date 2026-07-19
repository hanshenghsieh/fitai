# BETTERBIT-NATIVE-INTEGRATIONS-001 — Founder checklist

This checklist separates repository work from settings that can only be completed
in Google Cloud, Supabase, Apple Developer, or Xcode. Do not place provider
secrets in `NEXT_PUBLIC_*`, the iOS bundle, or source control.

## Google Cloud

- Configure the OAuth consent screen, support email, privacy URL, and production
  publishing status.
- Request only `openid`, `email`, and `profile`.
- Create a Web OAuth client for Supabase.
- Add Supabase's callback URL as an authorized redirect URI:
  `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`.
- If a separate iOS client is created later, its Bundle ID must be
  `app.fitai.betterbit`. The current Supabase browser-based PKCE flow uses the
  Web client and does not embed a Google client secret in the app.

## Supabase Auth

- Enable the Google provider and enter the Web client ID and client secret.
- Enable the Apple provider.
- Set Site URL to the canonical production origin, normally
  `https://www.betterbit.app`.
- Add these Redirect URLs (plus the exact Preview origins used for acceptance):
  - `betterbit://auth/callback`
  - `https://www.betterbit.app/auth/callback`
  - `https://betterbit.app/auth/callback`
- Keep PKCE enabled. Do not enable nonce-check bypass as a permanent workaround.
- Confirm identity-linking policy in a staging account before testing an Email
  user with the same Google/Apple email. BetterBit does not merge identities by
  querying email itself.

## Apple Developer / Sign in with Apple

- Enable **Sign in with Apple** for App Identifier `app.fitai.betterbit`.
- In Xcode, add **Sign in with Apple** to the App target and refresh the
  provisioning profile.
- Confirm the native App ID / Bundle ID is listed as an accepted Apple Client ID
  in Supabase.
- For web Apple OAuth, create and configure the Services ID, return URL, Sign in
  with Apple key, Team ID, and Key ID. Put required secrets only in Supabase.
- If both web and native Apple flows are enabled, list the Services ID first in
  Supabase's Apple Client IDs and `app.fitai.betterbit` as an additional ID.
- Test Hide My Email and first-login name capture. Apple only supplies the name
  once.

## Apple Developer / HealthKit

- Enable **HealthKit** for App Identifier `app.fitai.betterbit`.
- In Xcode, add **HealthKit** to the App target and refresh the provisioning
  profile. The repository entitlements are preparation, not proof that the
  Developer Portal capability is active.
- Confirm the target uses the committed `App/App.entitlements`.
- Test on a physical iPhone; HealthKit is not considered accepted from Windows
  Preview or an unsupported simulator alone.
- Update App Store Connect privacy disclosures and the public privacy policy
  before distribution. BetterBit reads body mass, body-fat percentage, height,
  steps, active energy, and workouts; this release does not write HealthKit data.

## Xcode / device acceptance

- Run `npm ci`, `npm run build:ios-local`, then `npx cap sync ios` on the Mac.
- Confirm SPM resolves Browser, Barcode Scanner, Camera, Local Notifications,
  RevenueCat, and Capacitor packages.
- Confirm URL scheme `betterbit` exists in the built target.
- Verify Google returns through `betterbit://auth/callback`.
- Verify native Apple presents the system AuthenticationServices sheet.
- Verify HealthKit displays the system authorization sheet and real samples.
- Verify barcode scanning requests camera permission and resolves a real GTIN.
- Confirm RevenueCat App User ID equals the authenticated Supabase `user.id`
  before and after logout/re-login.

## Open Food Facts

- No API key is required.
- Keep BetterBit's identifying User-Agent on server requests.
- Treat missing/incomplete community records as a real lookup outcome; never
  manufacture nutrition values or report a successful match without usable
  product nutrition.
