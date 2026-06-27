import UIKit
import Capacitor

/// WKWebView shell: edge-to-edge canvas, disable pinch / double-tap zoom.
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
            let insets = view.safeAreaInsets
            scrollView.contentInset = UIEdgeInsets(top: -insets.top, left: 0, bottom: -insets.bottom, right: 0)
            scrollView.scrollIndicatorInsets = scrollView.contentInset
        }
    }
}
