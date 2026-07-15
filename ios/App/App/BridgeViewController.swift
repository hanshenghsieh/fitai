import UIKit
import Capacitor
import WebKit

/// WKWebView shell: edge-to-edge canvas, disable pinch / double-tap zoom.
/// Cap 8: do NOT use `override` / `super` on webViewWebContentProcessDidTerminate
/// (that symbol is not an open override and breaks Xcode builds).
class BridgeViewController: CAPBridgeViewController {
    private let canvasColor = UIColor(red: 255 / 255, green: 249 / 255, blue: 242 / 255, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = canvasColor
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        applyWebViewShellSettings()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        applyWebViewShellSettings()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        .darkContent
    }

    /// Plain method (no override / no super) — QA Gate v2 asserts this exact shape.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }

    private func applyWebViewShellSettings() {
        guard let webView = webView else { return }

        webView.isOpaque = true
        webView.backgroundColor = canvasColor
        webView.frame = view.bounds

        let scrollView = webView.scrollView
        scrollView.backgroundColor = canvasColor
        scrollView.minimumZoomScale = 1.0
        scrollView.maximumZoomScale = 1.0
        scrollView.bouncesZoom = false
        scrollView.bounces = false
        scrollView.alwaysBounceVertical = false
        scrollView.contentInsetAdjustmentBehavior = .never
        scrollView.contentInset = .zero
        scrollView.scrollIndicatorInsets = .zero
        if #available(iOS 13.0, *) {
            scrollView.automaticallyAdjustsScrollIndicatorInsets = false
        }

        if #available(iOS 11.0, *) {
            injectSafeAreaInsets(view.safeAreaInsets, into: webView)
        }
    }

    private func injectSafeAreaInsets(_ insets: UIEdgeInsets, into webView: WKWebView) {
        let top = max(insets.top, 20)
        let bottom = max(insets.bottom, 0)
        let script = """
        document.documentElement.classList.add('capacitor-ios');
        document.documentElement.style.setProperty('--app-safe-top', '\(top)px');
        document.documentElement.style.setProperty('--app-safe-bottom', '\(bottom)px');
        """
        webView.evaluateJavaScript(script, completionHandler: nil)
    }
}
