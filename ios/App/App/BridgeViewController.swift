import UIKit
import Capacitor

/// WKWebView shell: match app canvas, disable pinch / double-tap zoom.
class BridgeViewController: CAPBridgeViewController {
    private let canvasColor = UIColor(red: 255 / 255, green: 249 / 255, blue: 242 / 255, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = canvasColor
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        applyWebViewShellSettings()
    }

    private func applyWebViewShellSettings() {
        guard let webView = webView else { return }

        webView.isOpaque = true
        webView.backgroundColor = canvasColor

        let scrollView = webView.scrollView
        scrollView.backgroundColor = canvasColor
        scrollView.minimumZoomScale = 1.0
        scrollView.maximumZoomScale = 1.0
        scrollView.bouncesZoom = false
        scrollView.bounces = false
        scrollView.alwaysBounceVertical = false
        scrollView.contentInsetAdjustmentBehavior = .never
    }
}
