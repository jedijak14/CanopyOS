# CanopyOS Aurora

CanopyOS Aurora is a desktop-inspired experience that runs in a web browser. Serve the repository as a static site (for example, `python3 -m http.server 8000`) or deploy it to Vercel. Create a local profile to get started; profile data is stored in your browser.

## Highlights

- Open Fern from the Dock, menu bar, or with **Option/Alt + Space**. Type or use the microphone where speech recognition is supported. Use the expand button or green window control for the full app. Fern can check battery status when the browser exposes it, and can request your location with your permission.
- Fern and Clock share multiple timers. Try “set a timer for 2 minutes called tea”, “pause tea timer”, “resume tea timer”, “how much time is left on the tea timer”, or “cancel all timers”. The active timers and countdown update live in Fern and Clock. Timers without a name refer to the most recent applicable timer.
- Choose a city in Weather or Settings → Location, or explicitly grant current-location access. Weather data comes from Open-Meteo. The Weather live wallpaper follows that location and refreshes periodically. Other animated wallpapers are available in Settings → Wallpaper; reduced-motion preferences are respected.
- Add and remove national public-holiday calendars from Calendar, including the US and China. Holiday data is provided by [date-holidays](https://github.com/commenthol/date-holidays); dates can change, and local subdivisions and official one-off changes may not be represented. See `vendor/holidays.LICENSE.txt` for third-party licenses.
- Canopy Browser includes tabs, favorites, history, a start page and Wikipedia-backed suggestions/results, with a direct web-search link. Sites that prohibit embedding can be opened in the host browser using the persistent button.

## Android Fern assistant

The `android/` project packages this same CanopyOS app and exposes Fern as an Android voice-interaction assistant. After installation, use Fern's Android assistant settings button (or Android's Default apps → Digital assistant app screen) to select it. Android opens Fern from its assistant gesture; always-on wake-word detection is intentionally not enabled. Fern's spoken replies use the app's downloadable Kokoro neural voice offline after first setup, not the phone's installed TTS voice. Incoming speech uses the Android speech-recognition provider, and open-ended answers still require the existing online model service. Build, voice-model size, and third-party license details are in `android/README.md`.

## Web platform limits

Timers are stored per local profile and continue counting down when the apps are closed or the page is away. Alerts appear when CanopyOS is open or reopened; a closed browser cannot deliver a notification at the deadline. Paused timers remain paused.

This is a web app, not a native operating system or a standalone Chromium distribution. It uses the engine of the browser running it and cannot override a site's frame restrictions. Some pages, including many search and sign-in pages, therefore must open in a separate browser tab. Battery, microphone, and geolocation APIs depend on browser support, secure context, and permissions. Open-ended Fern responses and weather require external services and network access; they can be unavailable. Location is requested only when you choose to use it, and coordinates are saved in your local profile for weather.

## Workspace features

- Every app can enter CanopyOS full-screen with its green window control or **Ctrl + Shift + F**; use the same control or shortcut to restore it. This fills the CanopyOS workspace, not the browser's native full-screen mode. The Window menu also offers left/right tiling (**Ctrl + Alt + Arrow**).
- Open Launchpad from the menu bar, Canopy menu, or **Ctrl + Shift + A**. Spotlight also searches locally stored notes. **Ctrl/Command + M** minimizes, **Ctrl/Command + W** closes the active window, and **Ctrl + Shift + N** creates a note (browser/OS shortcuts may take precedence).
- Reminders supports locally saved tasks, editing, due dates, optional times, completion and filters. Timed reminders notify once while CanopyOS is open (or when the tab resumes); they cannot alert while the browser is closed. Activity Monitor shows CanopyOS windows, browser connectivity and estimated browser storage, not system-wide processes or CPU usage.
- Click the menu-bar clock for notification history. Focus in Control Center suppresses CanopyOS notification pop-ups during the current session while retaining them in history. Wi-Fi and Bluetooth are managed by the host device, not this web app.

- The translucent Dock supports magnification, size, and optional auto-hide in Settings → Dock. Mission Control (**Ctrl + Shift + M**) lists open and minimized windows; **Ctrl + Shift + D** shows the desktop or restores its windows. The menu bar clock can use 24-hour time.
- Notes can be duplicated and exported as plain text. Calendar events can be edited and exported as an iCalendar file; exported events exclude the separately maintained holiday calendars.

Run `npm install` and `npm test` for the automated workspace smoke tests.
