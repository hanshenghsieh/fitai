# BETTERBIT-NATIVE-INTEGRATIONS-001 — Founder checklist

This checklist separates repository work from settings that can only be completed
in Google Cloud, Supabase, Apple Developer, or Xcode. Do not place provider
secrets in `NEXT_PUBLIC_*`, the iOS bundle, or source control.

## Google Cloud

- Configure the OAuth consent screen, support email, privacy URL, and production
  publishing status.
- Request only `openid`, `email`, and `profile`.
- Create a Web OAuth client for Supabase and native ID-token verification.
- Add Supabase's callback URL as an authorized redirect URI:
  `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`.
- Create an iOS OAuth client whose Bundle ID is exactly `app.fitai.betterbit`.
- Client IDs are public identifiers, but the Google client secret must remain
  only in Supabase and must never be put in a `NEXT_PUBLIC_*` variable.

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

- Add these App target user-defined build settings for both Debug and Release:
  - `GOOGLE_IOS_CLIENT_ID`:
    `403467297093-roq8l6b583110qqeh90rpurmugnhd3do.apps.googleusercontent.com`
  - `GOOGLE_WEB_CLIENT_ID`:
    `403467297093-85u48ft29ma5t4ijj19r331rr4pda8ep.apps.googleusercontent.com`
  - `GOOGLE_REVERSED_IOS_CLIENT_ID`:
    `com.googleusercontent.apps.403467297093-roq8l6b583110qqeh90rpurmugnhd3do`
- Run `npm ci`, `npm run build:ios-local`, then `npx cap sync ios` on the Mac.
- Confirm SPM resolves the official `GoogleSignIn` 9.2.0 package plus Barcode
  Scanner, Camera, Local Notifications, RevenueCat, and Capacitor packages.
- Confirm URL schemes `betterbit` and the reversed Google iOS client ID exist in
  the built target.
- Verify native Google presents the Google iOS SDK sheet, returns an ID token to
  the WebView, and never opens Safari or `localhost`.
- Verify native Apple presents the system AuthenticationServices sheet.
- Verify HealthKit displays the system authorization sheet and real samples.
- Verify barcode scanning requests camera permission and resolves a real GTIN.
- Confirm RevenueCat App User ID equals the authenticated Supabase `user.id`
  before and after logout/re-login.

### Mac rebuild and expanded Info.plist verification

```sh
npm ci
npm run build:ios-local
npx cap sync ios
cd ios/App
xcodebuild -resolvePackageDependencies -project App.xcodeproj -scheme App
xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath ../../.derived-data CODE_SIGNING_ALLOWED=NO build

APP_PLIST='../../.derived-data/Build/Products/Debug-iphoneos/App.app/Info.plist'
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_PLIST"
/usr/libexec/PlistBuddy -c 'Print :GIDClientID' "$APP_PLIST"
/usr/libexec/PlistBuddy -c 'Print :GIDServerClientID' "$APP_PLIST"
/usr/libexec/PlistBuddy -c 'Print :CFBundleURLTypes' "$APP_PLIST"
```

The four outputs must show bundle ID `app.fitai.betterbit`, the exact iOS and
Web client IDs above, and the exact reversed iOS client scheme. Resolve any
literal `$(GOOGLE_...)`, blank value, or different client before installing on
a device.

## Open Food Facts

- No API key is required.
- Keep BetterBit's identifying User-Agent on server requests.
- Treat missing/incomplete community records as a real lookup outcome; never
  manufacture nutrition values or report a successful match without usable
  product nutrition.
