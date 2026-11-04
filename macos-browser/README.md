# Canopy Browser for macOS

A separate native macOS browser built with AppKit and WebKit. It is not the
browser inside the CanopyOS website. Websites run as top-level pages, so their
frame-embedding restrictions do not apply. It uses Apple's WebKit engine and
has its own app-specific website data, rather than Safari's cookies or history.
It is not a new rendering engine, and site compatibility, network access,
permissions, authentication, DRM and operating-system support can still vary.

## Build on a Mac

Requires macOS 12 or later and Xcode Command Line Tools. In Terminal:

```sh
xcode-select --install  # if tools are not installed
cd macos-browser
./build.sh
open "output/Canopy Browser.app"
```

The build is unsigned and not notarized. macOS Gatekeeper may require you to
control-click the app and choose Open. A signed, notarized distribution needs
an Apple Developer account and a build on macOS; this repository does not
contain a prebuilt or signed application.

Features: native tabs that keep state, address/search bar, back/forward,
reload/stop, HTTPS/HTTP indication, downloads with a save dialog, file upload,
JavaScript dialogs, and new-window links opening as tabs. Shortcuts: Command-L,
Command-T, Command-W, Command-R. Localhost is opened over HTTP; normal domains
default to HTTPS. Search terms are sent to Google. HTTP sites are unencrypted.
The native app's WebKit data is separate from CanopyOS's web-site data, and
CanopyOS's reset button does not delete the native browser's data.

Website content is remote and untrusted. The browser does not inject a native
JavaScript bridge into pages or grant them arbitrary access to the computer.
macOS and WebKit still control permissions and security checks.
