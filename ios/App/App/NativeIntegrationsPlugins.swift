import AuthenticationServices
import Capacitor
import CryptoKit
import GoogleSignIn
import HealthKit
import Security
import UIKit

@objc(GoogleAuthPlugin)
public final class GoogleAuthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GoogleAuthPlugin"
    public let jsName = "GoogleAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getConfiguration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signOut", returnType: CAPPluginReturnPromise)
    ]

    private static let expectedBundleId = "app.fitai.betterbit"
    private static let expectedIosClientId =
        "403467297093-8rae251r35a652fq4h0fplarl0u0m4lu.apps.googleusercontent.com"
    private static let expectedServerClientId =
        "403467297093-85u48ft29ma5t4ijj19r331rr4pda8ep.apps.googleusercontent.com"
    private static let expectedReversedScheme =
        "com.googleusercontent.apps.403467297093-8rae251r35a652fq4h0fplarl0u0m4lu"

    @objc public func getConfiguration(_ call: CAPPluginCall) {
        let iosClientId = Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String
        let serverClientId = Bundle.main.object(forInfoDictionaryKey: "GIDServerClientID") as? String
        let schemes = registeredUrlSchemes()
        call.resolve([
            "platform": "ios",
            "bundleId": Bundle.main.bundleIdentifier ?? "",
            "iosClientIdPresent": configuredValuePresent(iosClientId),
            "iosClientIdSuffix": safeSuffix(iosClientId),
            "serverClientIdPresent": configuredValuePresent(serverClientId),
            "serverClientIdSuffix": safeSuffix(serverClientId),
            "reversedSchemePresent": schemes.contains(Self.expectedReversedScheme)
        ])
    }

    @objc public func signIn(_ call: CAPPluginCall) {
        guard let iosClientId = Bundle.main.object(forInfoDictionaryKey: "GIDClientID")
                as? String,
              iosClientId.hasSuffix(".apps.googleusercontent.com"),
              !iosClientId.contains("$("),
              let serverClientId = Bundle.main.object(forInfoDictionaryKey: "GIDServerClientID")
                as? String,
              serverClientId.hasSuffix(".apps.googleusercontent.com"),
              !serverClientId.contains("$(") else {
            call.reject(
                "Google OAuth Client ID 設定不完整。",
                "GOOGLE_CONFIGURATION_MISSING"
            )
            return
        }

        guard Bundle.main.bundleIdentifier == Self.expectedBundleId,
              iosClientId == Self.expectedIosClientId,
              serverClientId == Self.expectedServerClientId else {
            call.reject(
                "Google OAuth Client ID 與 BetterBit iOS 設定不一致。",
                "GOOGLE_CONFIGURATION_MISMATCH"
            )
            return
        }

        guard registeredUrlSchemes().contains(Self.expectedReversedScheme) else {
            call.reject(
                "Google iOS callback URL scheme 未加入 App 設定。",
                "GOOGLE_URL_SCHEME_MISSING"
            )
            return
        }

        guard let presenter = bridge?.viewController else {
            call.reject("無法顯示 Google 登入畫面。", "GOOGLE_PRESENTER_MISSING")
            return
        }

        GIDSignIn.sharedInstance.configuration = GIDConfiguration(
            clientID: iosClientId,
            serverClientID: serverClientId
        )
        let nonce = call.getString("nonce")

        DispatchQueue.main.async {
            GIDSignIn.sharedInstance.signIn(
                withPresenting: presenter,
                hint: nil,
                additionalScopes: nil,
                nonce: nonce
            ) { result, error in
                if let error = error {
                    let nsError = error as NSError
                    if nsError.code == -5 && nsError.domain.contains("GIDSignIn") {
                        call.reject("已取消 Google 登入。", "GOOGLE_AUTH_CANCELLED", error)
                    } else {
                        call.reject("Google 登入失敗。", "GOOGLE_AUTH_FAILED", error)
                    }
                    return
                }

                guard let user = result?.user,
                      let identityToken = user.idToken?.tokenString,
                      !identityToken.isEmpty else {
                    call.reject(
                        "Google 未回傳有效的 ID token。",
                        "GOOGLE_ID_TOKEN_MISSING"
                    )
                    return
                }

                var response: JSObject = ["identityToken": identityToken]
                if let email = user.profile?.email, !email.isEmpty {
                    response["email"] = email
                }
                if let name = user.profile?.name, !name.isEmpty {
                    response["name"] = name
                }
                call.resolve(response)
            }
        }
    }

    @objc public func signOut(_ call: CAPPluginCall) {
        GIDSignIn.sharedInstance.signOut()
        call.resolve()
    }

    private func configuredValuePresent(_ value: String?) -> Bool {
        guard let value = value, !value.isEmpty, !value.contains("$(") else { return false }
        return true
    }

    private func safeSuffix(_ value: String?) -> String {
        guard configuredValuePresent(value), let value = value else { return "" }
        return String(value.suffix(24))
    }

    private func registeredUrlSchemes() -> Set<String> {
        guard let urlTypes = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes")
            as? [[String: Any]] else {
            return []
        }
        return Set(urlTypes.flatMap { type in
            type["CFBundleURLSchemes"] as? [String] ?? []
        })
    }
}

@objc(AppleAuthPlugin)
public final class AppleAuthPlugin: CAPPlugin, CAPBridgedPlugin,
    ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleAuthPlugin"
    public let jsName = "AppleAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCredentialState", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var pendingRawNonce: String?

    public override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(credentialRevoked),
            name: ASAuthorizationAppleIDProvider.credentialRevokedNotification,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc public func signIn(_ call: CAPPluginCall) {
        guard pendingCall == nil else {
            call.reject("Apple 登入正在進行中。", "APPLE_AUTH_IN_PROGRESS")
            return
        }

        let rawNonce: String
        do {
            rawNonce = try makeNonce()
        } catch {
            call.reject("無法建立安全的 Apple 登入請求。", "APPLE_NONCE_FAILED", error)
            return
        }

        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(rawNonce)

        pendingCall = call
        pendingRawNonce = rawNonce

        DispatchQueue.main.async {
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    @objc public func getCredentialState(_ call: CAPPluginCall) {
        guard let identifier = call.getString("userIdentifier"), !identifier.isEmpty else {
            call.reject("缺少 Apple 使用者識別碼。", "APPLE_USER_IDENTIFIER_REQUIRED")
            return
        }

        ASAuthorizationAppleIDProvider().getCredentialState(forUserID: identifier) { state, error in
            if let error = error {
                call.reject("無法確認 Apple 登入狀態。", "APPLE_CREDENTIAL_STATE_FAILED", error)
                return
            }

            let value: String
            switch state {
            case .authorized:
                value = "authorized"
            case .revoked:
                value = "revoked"
            case .notFound:
                value = "not_found"
            case .transferred:
                value = "transferred"
            @unknown default:
                value = "unknown"
            }
            call.resolve(["state": value])
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = bridge?.viewController?.view.window {
            return window
        }
        if let windowScene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive }),
           let window = windowScene.windows.first(where: { $0.isKeyWindow }) {
            return window
        }
        return ASPresentationAnchor()
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let call = pendingCall,
              let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8),
              !identityToken.isEmpty,
              let rawNonce = pendingRawNonce else {
            finishWithError("Apple 未回傳有效的身份憑證。", code: "APPLE_IDENTITY_TOKEN_MISSING")
            return
        }

        var result: JSObject = [
            "identityToken": identityToken,
            "userIdentifier": credential.user,
            "rawNonce": rawNonce
        ]
        if let code = credential.authorizationCode {
            result["authorizationCode"] = code.base64EncodedString()
        }
        if let email = credential.email, !email.isEmpty {
            result["email"] = email
        }
        if let givenName = credential.fullName?.givenName, !givenName.isEmpty {
            result["givenName"] = givenName
        }
        if let familyName = credential.fullName?.familyName, !familyName.isEmpty {
            result["familyName"] = familyName
        }

        pendingCall = nil
        pendingRawNonce = nil
        call.resolve(result)
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        let authError = error as? ASAuthorizationError
        if authError?.code == .canceled {
            finishWithError("已取消 Apple 登入。", code: "APPLE_AUTH_CANCELLED", error: error)
        } else {
            finishWithError("Apple 登入失敗。", code: "APPLE_AUTH_FAILED", error: error)
        }
    }

    @objc private func credentialRevoked() {
        notifyListeners("credentialRevoked", data: ["revoked": true])
    }

    private func finishWithError(_ message: String, code: String, error: Error? = nil) {
        let call = pendingCall
        pendingCall = nil
        pendingRawNonce = nil
        call?.reject(message, code, error)
    }

    private func makeNonce(length: Int = 32) throws -> String {
        let characters = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        while result.count < length {
            var bytes = [UInt8](repeating: 0, count: 16)
            let status = bytes.withUnsafeMutableBytes { buffer in
                SecRandomCopyBytes(kSecRandomDefault, buffer.count, buffer.baseAddress!)
            }
            guard status == errSecSuccess else {
                throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
            }
            for byte in bytes where result.count < length && Int(byte) < characters.count {
                result.append(characters[Int(byte)])
            }
        }
        return result
    }

    private func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

@objc(HealthKitPlugin)
public final class HealthKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitPlugin"
    public let jsName = "HealthKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAuthorizationSummary", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLatestBodyMetrics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDailyActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWorkouts", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()

    @objc public func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc public func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("此裝置不支援 Apple 健康。", "HEALTHKIT_UNAVAILABLE")
            return
        }
        guard let readTypes = healthReadTypes() else {
            call.reject("無法建立健康資料類型。", "HEALTHKIT_TYPE_UNAVAILABLE")
            return
        }

        store.requestAuthorization(toShare: [], read: readTypes) { success, error in
            if let error = error {
                call.reject("Apple 健康授權未完成。", "HEALTHKIT_AUTHORIZATION_FAILED", error)
                return
            }
            call.resolve([
                "requestCompleted": success,
                "readAuthorizationIsPrivate": true
            ])
        }
    }

    @objc public func getAuthorizationSummary(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve([
                "available": false,
                "requestStatus": "unavailable",
                "readAuthorizationIsPrivate": true
            ])
            return
        }
        guard let readTypes = healthReadTypes() else {
            call.reject("無法建立健康資料類型。", "HEALTHKIT_TYPE_UNAVAILABLE")
            return
        }

        store.getRequestStatusForAuthorization(toShare: [], read: readTypes) { status, error in
            if let error = error {
                call.reject("無法讀取 Apple 健康授權摘要。", "HEALTHKIT_AUTHORIZATION_STATUS_FAILED", error)
                return
            }
            let value: String
            switch status {
            case .shouldRequest:
                value = "should_request"
            case .unnecessary:
                value = "unnecessary"
            case .unknown:
                value = "unknown"
            @unknown default:
                value = "unknown"
            }
            call.resolve([
                "available": true,
                "requestStatus": value,
                "readAuthorizationIsPrivate": true
            ])
        }
    }

    @objc public func getLatestBodyMetrics(_ call: CAPPluginCall) {
        guard ensureAvailable(call) else { return }
        let definitions: [(String, HKQuantityTypeIdentifier, HKUnit, Double)] = [
            ("weightKg", .bodyMass, .gramUnit(with: .kilo), 1),
            ("bodyFatPercent", .bodyFatPercentage, .percent(), 100),
            ("heightCm", .height, .meterUnit(with: .centi), 1)
        ]
        let group = DispatchGroup()
        let lock = NSLock()
        var result: JSObject = [:]
        var firstError: Error?

        for (key, identifier, unit, multiplier) in definitions {
            guard let type = HKObjectType.quantityType(forIdentifier: identifier) else { continue }
            group.enter()
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(
                sampleType: type,
                predicate: nil,
                limit: 1,
                sortDescriptors: [sort]
            ) { _, samples, error in
                defer { group.leave() }
                if let error = error {
                    lock.lock()
                    if firstError == nil { firstError = error }
                    lock.unlock()
                    return
                }
                guard let sample = samples?.first as? HKQuantitySample else { return }
                let value = sample.quantity.doubleValue(for: unit) * multiplier
                guard value.isFinite, value > 0 else { return }
                let payload: JSObject = [
                    "value": value,
                    "date": Self.isoDate(sample.endDate),
                    "uuid": sample.uuid.uuidString,
                    "source": sample.sourceRevision.source.name,
                    "sourceBundleIdentifier": sample.sourceRevision.source.bundleIdentifier
                ]
                lock.lock()
                result[key] = payload
                lock.unlock()
            }
            store.execute(query)
        }

        group.notify(queue: .main) {
            if let error = firstError {
                call.reject("無法讀取身體資料。", "HEALTHKIT_QUERY_FAILED", error)
                return
            }
            result["hasData"] = !result.isEmpty
            call.resolve(result)
        }
    }

    @objc public func getDailyActivity(_ call: CAPPluginCall) {
        guard ensureAvailable(call) else { return }
        guard let range = dateRange(call) else { return }
        let calendar = Calendar.autoupdatingCurrent
        let startDay = calendar.startOfDay(for: range.start)
        let endDay = calendar.startOfDay(for: range.end)
        var days: [Date] = []
        var cursor = startDay
        while cursor <= endDay {
            days.append(cursor)
            guard let next = calendar.date(byAdding: .day, value: 1, to: cursor) else { break }
            cursor = next
        }

        let group = DispatchGroup()
        let lock = NSLock()
        var rows: [String: JSObject] = [:]
        var firstError: Error?

        for day in days {
            let key = Self.localDay(day)
            rows[key] = ["date": key, "steps": 0, "activeEnergyKcal": 0]
            guard let nextDay = calendar.date(byAdding: .day, value: 1, to: day) else { continue }
            let predicate = HKQuery.predicateForSamples(
                withStart: day,
                end: nextDay,
                options: [.strictStartDate, .strictEndDate]
            )

            if let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) {
                group.enter()
                let query = HKStatisticsQuery(
                    quantityType: stepType,
                    quantitySamplePredicate: predicate,
                    options: .cumulativeSum
                ) { _, statistics, error in
                    defer { group.leave() }
                    if let error = error {
                        lock.lock()
                        if firstError == nil { firstError = error }
                        lock.unlock()
                        return
                    }
                    let value = statistics?.sumQuantity()?.doubleValue(for: .count()) ?? 0
                    lock.lock()
                    rows[key]?["steps"] = max(0, value)
                    lock.unlock()
                }
                store.execute(query)
            }

            if let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
                group.enter()
                let query = HKStatisticsQuery(
                    quantityType: energyType,
                    quantitySamplePredicate: predicate,
                    options: .cumulativeSum
                ) { _, statistics, error in
                    defer { group.leave() }
                    if let error = error {
                        lock.lock()
                        if firstError == nil { firstError = error }
                        lock.unlock()
                        return
                    }
                    let value = statistics?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
                    lock.lock()
                    rows[key]?["activeEnergyKcal"] = max(0, value)
                    lock.unlock()
                }
                store.execute(query)
            }
        }

        group.notify(queue: .main) {
            if let error = firstError {
                call.reject("無法讀取每日活動資料。", "HEALTHKIT_QUERY_FAILED", error)
                return
            }
            let sortedRows = rows.keys.sorted().compactMap { rows[$0] }
            call.resolve([
                "timezone": TimeZone.autoupdatingCurrent.identifier,
                "days": sortedRows
            ])
        }
    }

    @objc public func getWorkouts(_ call: CAPPluginCall) {
        guard ensureAvailable(call) else { return }
        guard let range = dateRange(call) else { return }
        let predicate = HKQuery.predicateForSamples(
            withStart: range.start,
            end: range.end,
            options: [.strictStartDate, .strictEndDate]
        )
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { _, samples, error in
            if let error = error {
                call.reject("無法讀取運動紀錄。", "HEALTHKIT_QUERY_FAILED", error)
                return
            }

            var seen = Set<UUID>()
            let workouts: [JSObject] = (samples as? [HKWorkout] ?? []).compactMap { workout in
                guard !seen.contains(workout.uuid), workout.duration > 0 else { return nil }
                seen.insert(workout.uuid)
                var row: JSObject = [
                    "uuid": workout.uuid.uuidString,
                    "activityType": Int(workout.workoutActivityType.rawValue),
                    "startDate": Self.isoDate(workout.startDate),
                    "endDate": Self.isoDate(workout.endDate),
                    "durationSeconds": workout.duration,
                    "source": workout.sourceRevision.source.name,
                    "sourceBundleIdentifier": workout.sourceRevision.source.bundleIdentifier
                ]
                if let energy = workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()),
                   energy.isFinite, energy >= 0 {
                    row["activeEnergyKcal"] = energy
                }
                return row
            }
            call.resolve([
                "timezone": TimeZone.autoupdatingCurrent.identifier,
                "workouts": workouts
            ])
        }
        store.execute(query)
    }

    private func healthReadTypes() -> Set<HKObjectType>? {
        guard
            let weight = HKObjectType.quantityType(forIdentifier: .bodyMass),
            let bodyFat = HKObjectType.quantityType(forIdentifier: .bodyFatPercentage),
            let height = HKObjectType.quantityType(forIdentifier: .height),
            let steps = HKObjectType.quantityType(forIdentifier: .stepCount),
            let energy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)
        else {
            return nil
        }
        return [weight, bodyFat, height, steps, energy, HKObjectType.workoutType()]
    }

    private func ensureAvailable(_ call: CAPPluginCall) -> Bool {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("此裝置不支援 Apple 健康。", "HEALTHKIT_UNAVAILABLE")
            return false
        }
        return true
    }

    private func dateRange(_ call: CAPPluginCall) -> (start: Date, end: Date)? {
        guard let startRaw = call.getString("startDate"),
              let endRaw = call.getString("endDate"),
              let start = Self.parseDate(startRaw),
              let end = Self.parseDate(endRaw),
              start <= end else {
            call.reject("日期範圍無效。", "HEALTHKIT_INVALID_DATE")
            return nil
        }
        return (start, end)
    }

    private static func parseDate(_ value: String) -> Date? {
        if let date = ISO8601DateFormatter().date(from: value) {
            return date
        }
        let formatter = DateFormatter()
        formatter.calendar = Calendar.autoupdatingCurrent
        formatter.timeZone = TimeZone.autoupdatingCurrent
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: value)
    }

    private static func isoDate(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }

    private static func localDay(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar.autoupdatingCurrent
        formatter.timeZone = TimeZone.autoupdatingCurrent
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}
