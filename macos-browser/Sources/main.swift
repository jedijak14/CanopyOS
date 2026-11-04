import Cocoa
import WebKit

// Canopy Browser for macOS: a native WebKit browser, not an embedded web page.
func browserAddressURL(_ raw: String) -> URL? {
    let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty else { return nil }
    if let explicit = URL(string: text), let scheme = explicit.scheme?.lowercased(), ["https", "http"].contains(scheme), explicit.host != nil { return explicit }
    if !text.contains(where: { $0.isWhitespace }) && !text.contains("://"), let candidate = URL(string: "https://" + text), let host = candidate.host, candidate.user == nil, candidate.password == nil {
        let local = host.lowercased() == "localhost" || host == "127.0.0.1" || host == "::1" || host == "[::1]"
        if local { return URL(string: "http://" + text) }
        if host.contains(".") { return candidate }
    }
    var search = URLComponents(string: "https://www.google.com/search")!
    search.queryItems = [URLQueryItem(name: "q", value: text)]
    return search.url
}


final class BrowserTab {
    let id = UUID()
    let webView: WKWebView
    var observations: [NSKeyValueObservation] = []
    init(webView: WKWebView) { self.webView = webView }
}

final class BrowserController: NSWindowController, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate, NSTextFieldDelegate {
    private var tabs: [BrowserTab] = []
    private var selectedID: UUID?
    private let tabStack = NSStackView()
    private let content = NSView()
    private let address = NSTextField()
    private let status = NSTextField(labelWithString: "")
    private var backButton: NSButton!
    private var forwardButton: NSButton!
    private var reloadButton: NSButton!
    private let defaultURL = URL(string: "https://www.wikipedia.org/")!
    private var active: BrowserTab? { tabs.first { $0.id == selectedID } }

    init() {
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1120, height: 760), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Canopy Browser"
        window.minSize = NSSize(width: 640, height: 420)
        window.center()
        super.init(window: window)
        buildUI()
        newTab(nil)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    private func button(_ symbol: String, label: String, action: Selector) -> NSButton {
        let b = NSButton(image: NSImage(systemSymbolName: symbol, accessibilityDescription: label) ?? NSImage(), target: self, action: action)
        b.bezelStyle = .texturedRounded
        b.toolTip = label
        b.setAccessibilityLabel(label)
        return b
    }
    private func buildUI() {
        guard let root = window?.contentView else { return }
        root.wantsLayer = true
        let bar = NSStackView()
        bar.orientation = .horizontal; bar.spacing = 8; bar.alignment = .centerY
        bar.edgeInsets = NSEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)
        backButton = button("chevron.left", label: "Back", action: #selector(goBack(_:)))
        forwardButton = button("chevron.right", label: "Forward", action: #selector(goForward(_:)))
        reloadButton = button("arrow.clockwise", label: "Reload", action: #selector(reloadPage(_:)))
        address.placeholderString = "Search or enter a website"
        address.delegate = self; address.target = self; address.action = #selector(openAddress(_:))
        address.setAccessibilityLabel("Address and search")
        address.lineBreakMode = .byTruncatingMiddle
        address.setContentHuggingPriority(.defaultLow, for: .horizontal)
        for v in [backButton!, forwardButton!, reloadButton!, address, button("plus", label: "New tab", action: #selector(newTab(_:)))] as [NSView] { bar.addArrangedSubview(v) }
        tabStack.orientation = .horizontal; tabStack.spacing = 4; tabStack.alignment = .centerY
        tabStack.edgeInsets = NSEdgeInsets(top: 0, left: 12, bottom: 6, right: 12)
        let tabScroll = NSScrollView(); tabScroll.documentView = tabStack; tabScroll.hasHorizontalScroller = true; tabScroll.drawsBackground = false
        tabStack.translatesAutoresizingMaskIntoConstraints = false
        status.font = .systemFont(ofSize: 11); status.textColor = .secondaryLabelColor
        status.lineBreakMode = .byTruncatingTail
        let stack = NSStackView(views: [bar, tabScroll, content, status])
        stack.orientation = .vertical; stack.alignment = .width; stack.spacing = 0
        stack.translatesAutoresizingMaskIntoConstraints = false; root.addSubview(stack)
        content.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: root.leadingAnchor), stack.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            stack.topAnchor.constraint(equalTo: root.topAnchor), stack.bottomAnchor.constraint(equalTo: root.bottomAnchor),
            tabScroll.heightAnchor.constraint(equalToConstant: 36),
            tabStack.leadingAnchor.constraint(equalTo: tabScroll.contentView.leadingAnchor), tabStack.topAnchor.constraint(equalTo: tabScroll.contentView.topAnchor),
            tabStack.heightAnchor.constraint(equalTo: tabScroll.contentView.heightAnchor),
            content.heightAnchor.constraint(greaterThanOrEqualToConstant: 200), status.heightAnchor.constraint(equalToConstant: 18)
        ])
    }

    @discardableResult private func makeTab(configuration: WKWebViewConfiguration? = nil, initialURL: URL? = nil) -> BrowserTab {
        let config = configuration ?? WKWebViewConfiguration()
        // The default persistent store belongs to this app, independent of Safari.
        if configuration == nil { config.websiteDataStore = .default() }
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self; web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(web)
        NSLayoutConstraint.activate([web.leadingAnchor.constraint(equalTo: content.leadingAnchor), web.trailingAnchor.constraint(equalTo: content.trailingAnchor), web.topAnchor.constraint(equalTo: content.topAnchor), web.bottomAnchor.constraint(equalTo: content.bottomAnchor)])
        let tab = BrowserTab(webView: web)
        let changed: (WKWebView, NSKeyValueObservedChange<URL?>) -> Void = { [weak self] _, _ in self?.refresh() }
        tab.observations.append(web.observe(\.url, options: [.new], changeHandler: changed))
        tab.observations.append(web.observe(\.title, options: [.new]) { [weak self] _, _ in self?.refresh() })
        tab.observations.append(web.observe(\.canGoBack, options: [.new]) { [weak self] _, _ in self?.refresh() })
        tab.observations.append(web.observe(\.canGoForward, options: [.new]) { [weak self] _, _ in self?.refresh() })
        tab.observations.append(web.observe(\.isLoading, options: [.new]) { [weak self] _, _ in self?.refresh() })
        tabs.append(tab); selectedID = tab.id; select(tab.id)
        if let url = initialURL { web.load(URLRequest(url: url)) }
        return tab
    }
    private func select(_ id: UUID) {
        selectedID = id
        for tab in tabs { tab.webView.isHidden = tab.id != id }
        refresh()
    }
    private func refresh() {
        guard let tab = active else { return }
        let web = tab.webView
        backButton.isEnabled = web.canGoBack; forwardButton.isEnabled = web.canGoForward
        reloadButton.toolTip = web.isLoading ? "Stop loading" : "Reload"
        reloadButton.image = NSImage(systemSymbolName: web.isLoading ? "xmark" : "arrow.clockwise", accessibilityDescription: reloadButton.toolTip)
        if window?.firstResponder !== address.currentEditor() { address.stringValue = web.url?.absoluteString ?? "" }
        let scheme = web.url?.scheme?.lowercased()
        status.stringValue = scheme == "http" ? "Not encrypted · HTTP" : scheme == "https" ? "HTTPS · Website controls its own content" : ""
        window?.title = web.title.map { $0.isEmpty ? "Canopy Browser" : "\($0) — Canopy Browser" } ?? "Canopy Browser"
        for view in tabStack.arrangedSubviews { tabStack.removeArrangedSubview(view); view.removeFromSuperview() }
        for entry in tabs {
            let group = NSStackView(); group.orientation = .horizontal; group.spacing = 2
            let name = NSButton(title: String((entry.webView.title?.isEmpty == false ? entry.webView.title! : "New Tab").prefix(22)), target: self, action: #selector(selectTab(_:)))
            name.identifier = NSUserInterfaceItemIdentifier(entry.id.uuidString); name.bezelStyle = .rounded
            name.state = entry.id == selectedID ? .on : .off
            let close = NSButton(title: "×", target: self, action: #selector(closeTabButton(_:)))
            close.identifier = name.identifier; close.isBordered = false; close.toolTip = "Close tab"
            close.setAccessibilityLabel("Close tab")
            group.addArrangedSubview(name); group.addArrangedSubview(close); tabStack.addArrangedSubview(group)
        }
    }
    @objc func selectTab(_ sender: NSButton) { if let s = sender.identifier?.rawValue, let id = UUID(uuidString: s) { select(id) } }
    @objc func closeTabButton(_ sender: NSButton) { if let s = sender.identifier?.rawValue, let id = UUID(uuidString: s) { closeTab(id) } }
    private func closeTab(_ id: UUID) {
        guard let index = tabs.firstIndex(where: { $0.id == id }) else { return }
        let tab = tabs.remove(at: index); tab.webView.stopLoading(); tab.webView.removeFromSuperview(); tab.observations.removeAll()
        if tabs.isEmpty { window?.close(); return }
        if selectedID == id { selectedID = tabs[min(index, tabs.count - 1)].id }
        if let selectedID = selectedID { select(selectedID) }
    }
    @objc func newTab(_ sender: Any?) { makeTab(initialURL: defaultURL); focusAddress(nil) }
    @objc func closeCurrentTab(_ sender: Any?) { if let id = selectedID { closeTab(id) } }
    @objc func goBack(_ sender: Any?) { active?.webView.goBack() }
    @objc func goForward(_ sender: Any?) { active?.webView.goForward() }
    @objc func reloadPage(_ sender: Any?) { guard let web = active?.webView else { return }; if web.isLoading { web.stopLoading() } else { web.reload() } }
    @objc func focusAddress(_ sender: Any?) { window?.makeFirstResponder(address); address.currentEditor()?.selectAll(nil) }
    @objc func openAddress(_ sender: Any?) {
        guard let url = browserAddressURL(address.stringValue) else { return }
        window?.makeFirstResponder(active?.webView); active?.webView.load(URLRequest(url: url))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { refresh() }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { showError(error, webView: webView) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { showError(error, webView: webView) }
    private func showError(_ error: Error, webView: WKWebView) { if (error as NSError).code != NSURLErrorCancelled && active?.webView === webView { status.stringValue = "Could not load page: \(error.localizedDescription)" } }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, let scheme = url.scheme?.lowercased() else { decisionHandler(.cancel); return }
        if ["http", "https", "about", "blob", "data"].contains(scheme) {
            if navigationAction.shouldPerformDownload { decisionHandler(.download) } else { decisionHandler(.allow) }
        } else {
            // Only a user-initiated link may hand a non-web URL to another app.
            if navigationAction.navigationType == .linkActivated && !["javascript", "data", "file"].contains(scheme) { NSWorkspace.shared.open(url) }
            decisionHandler(.cancel)
        }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) { decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download) }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let panel = NSSavePanel(); panel.nameFieldStringValue = suggestedFilename; panel.canCreateDirectories = true
        panel.begin { result in completionHandler(result == .OK ? panel.url : nil) }
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) { status.stringValue = "Download failed: \(error.localizedDescription)" }
    func downloadDidFinish(_ download: WKDownload) { status.stringValue = "Download complete" }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? { makeTab(configuration: configuration).webView }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert(); alert.messageText = frame.request.url?.host ?? "Website"; alert.informativeText = message; alert.addButton(withTitle: "OK"); alert.runModal(); completionHandler()
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert(); alert.messageText = frame.request.url?.host ?? "Website"; alert.informativeText = message; alert.addButton(withTitle: "OK"); alert.addButton(withTitle: "Cancel"); completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert(); alert.messageText = frame.request.url?.host ?? "Website"; alert.informativeText = prompt
        let field = NSTextField(string: defaultText ?? ""); field.frame.size.width = 300; alert.accessoryView = field; alert.addButton(withTitle: "OK"); alert.addButton(withTitle: "Cancel")
        completionHandler(alert.runModal() == .alertFirstButtonReturn ? field.stringValue : nil)
    }
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        let alert = NSAlert(); alert.messageText = "Allow camera or microphone?"; alert.informativeText = "\(origin.host) is requesting access. macOS may also ask for permission."; alert.addButton(withTitle: "Allow"); alert.addButton(withTitle: "Don't Allow")
        decisionHandler(alert.runModal() == .alertFirstButtonReturn ? .grant : .deny)
    }
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel(); panel.allowsMultipleSelection = parameters.allowsMultipleSelection; panel.canChooseFiles = true; panel.canChooseDirectories = parameters.allowsDirectories
        panel.begin { result in completionHandler(result == .OK ? panel.urls : nil) }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    var browser: BrowserController?
    func applicationDidFinishLaunching(_ notification: Notification) {
        browser = BrowserController(); installMenu(); browser?.showWindow(nil); NSApp.activate(ignoringOtherApps: true)
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    private func installMenu() {
        let menu = NSMenu(); NSApp.mainMenu = menu
        let app = NSMenuItem(); menu.addItem(app); let appMenu = NSMenu(); app.submenu = appMenu
        appMenu.addItem(withTitle: "Quit Canopy Browser", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let file = NSMenuItem(); menu.addItem(file); let fileMenu = NSMenu(title: "File"); file.submenu = fileMenu
        func add(_ menu: NSMenu, _ title: String, _ action: Selector, _ key: String) { let item = menu.addItem(withTitle: title, action: action, keyEquivalent: key); item.target = browser }
        add(fileMenu, "New Tab", #selector(BrowserController.newTab(_:)), "t"); add(fileMenu, "Close Tab", #selector(BrowserController.closeCurrentTab(_:)), "w")
        let edit = NSMenuItem(); menu.addItem(edit); let editMenu = NSMenu(title: "Edit"); edit.submenu = editMenu
        editMenu.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z"); editMenu.addItem(.separator())
        editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x"); editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c"); editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v"); editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        let view = NSMenuItem(); menu.addItem(view); let viewMenu = NSMenu(title: "View"); view.submenu = viewMenu
        add(viewMenu, "Address Bar", #selector(BrowserController.focusAddress(_:)), "l"); add(viewMenu, "Reload or Stop", #selector(BrowserController.reloadPage(_:)), "r")
    }
}
if CommandLine.arguments.contains("--self-test") {
    let checks = [
        browserAddressURL("example.com/path?q=1")?.host == "example.com",
        browserAddressURL("localhost:8080")?.scheme == "http",
        browserAddressURL("two words")?.host == "www.google.com",
        browserAddressURL("javascript:alert(1)")?.host == "www.google.com",
        browserAddressURL("  ") == nil
    ]
    if checks.contains(false) { fputs("Address handling self-test failed\n", stderr); exit(1) }
    print("Canopy Browser address handling passed."); exit(0)
}
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
