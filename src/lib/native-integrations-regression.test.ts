import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
}

describe('BETTERBIT-NATIVE-INTEGRATIONS-001 native contracts', () => {
  it('keeps native Supabase PKCE on persistent storage', () => {
    const client = source('src/lib/supabase/client.ts')
    assert.match(client, /persistSession:\s*true/)
    assert.match(client, /detectSessionInUrl:\s*false/)
    assert.match(client, /flowType:\s*'pkce'/)
    assert.match(client, /storageKey:\s*NATIVE_AUTH_STORAGE_KEY/)
  })

  it('configures the BetterBit callback and required privacy descriptions', () => {
    const plist = source('ios/App/App/Info.plist')
    assert.match(plist, /<string>betterbit<\/string>/)
    assert.match(plist, /<key>NSHealthShareUsageDescription<\/key>/)
    assert.match(plist, /體重、體脂、步數、活動熱量及運動紀錄/)
    assert.match(plist, /掃描商品條碼/)
  })

  it('registers real Apple Auth and HealthKit plugins in the bridge', () => {
    const bridge = source('ios/App/App/BridgeViewController.swift')
    const plugins = source('ios/App/App/NativeIntegrationsPlugins.swift')
    assert.match(bridge, /registerPluginInstance\(AppleAuthPlugin\(\)\)/)
    assert.match(bridge, /registerPluginInstance\(HealthKitPlugin\(\)\)/)
    assert.match(plugins, /ASAuthorizationAppleIDProvider/)
    assert.match(plugins, /request\.nonce = sha256\(rawNonce\)/)
    assert.match(plugins, /HKHealthStore\.isHealthDataAvailable\(\)/)
    assert.match(plugins, /options: \.cumulativeSum/)
    assert.match(plugins, /workout\.uuid\.uuidString/)
    assert.doesNotMatch(plugins, /print\(|NSLog\(/)
  })

  it('prepares Apple Sign In and HealthKit entitlements for Mac signing', () => {
    const entitlements = source('ios/App/App/App.entitlements')
    const project = source('ios/App/App.xcodeproj/project.pbxproj')
    assert.match(entitlements, /com\.apple\.developer\.applesignin/)
    assert.match(entitlements, /com\.apple\.developer\.healthkit/)
    assert.match(project, /CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements/)
    assert.match(project, /NativeIntegrationsPlugins\.swift in Sources/)
  })

  it('syncs maintained Browser and Barcode Scanner packages through SPM', () => {
    const packageJson = source('package.json')
    const swiftPackage = source('ios/App/CapApp-SPM/Package.swift')
    const capacitorJson = source('ios/App/App/capacitor.config.json')
    assert.match(packageJson, /"@capacitor\/browser"/)
    assert.match(packageJson, /"@capacitor\/barcode-scanner"/)
    assert.match(swiftPackage, /CapacitorBrowser/)
    assert.match(swiftPackage, /CapacitorBarcodeScanner/)
    assert.match(capacitorJson, /CAPBrowserPlugin/)
    assert.match(capacitorJson, /CapacitorBarcodeScannerPlugin/)
  })

  it('routes barcode records through the accepted Today commit contract', () => {
    const today = source('src/components/dashboard/TodayOS.tsx')
    const barcode = source('src/lib/barcode-food.ts')
    assert.match(today, /applyFoodRecordToLog\(item, draft/)
    assert.match(today, /commitLog\(patch\)/)
    assert.match(today, /targetDate=\{captureTargetDate\}/)
    assert.match(barcode, /sourceType:\s*'database_estimate'/)
    assert.match(barcode, /provider:\s*'open_food_facts'/)
  })
})
