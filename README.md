# CanopyOS Aurora

CanopyOS Aurora is a desktop-inspired experience that runs in a web browser. Serve the repository as a static site (for example, `python3 -m http.server 8000`) or deploy it to Vercel. Create a local profile to get started; profile data is stored in your browser.

## Highlights

- Open Fern as a spacious, movable app from the Dock, menu bar, or with **Option/Alt + Space**. Type or use the microphone where speech recognition is supported. Use the expand button or green window control to fill the workspace. Fern can check battery status when the browser exposes it, and can request your location with your permission.
- In Fern, attach an image or a video and ask a question. The existing `openai` model and Pollinations endpoint are unchanged. Images and four sampled video frames (without audio) are prepared locally and sent to the existing online service only on submit; clips are limited to five minutes and files to 40 MB. Media is not retained in later chat requests. Analysis depends on the provider supporting image input and being available.
- In Fern, choose **Share current note** to preview and attach up to 4,000 characters of the open Notes document to your next question. You can remove it before sending; it is not retained in later conversation history. The note is sent to Fern’s external answer service for that request. Screen awareness is limited to the current CanopyOS note—not your device screen, other apps, images, or embedded web pages.
- On first use and after a CanopyOS restart, the repository-provided Ventura hello recording plays over the Tahoe wallpaper. Press Enter or the button to continue in the currently displayed greeting’s language. The selected language is saved in the browser and used by the first-profile form, common desktop controls, date/time formatting, speech recognition, and Fern’s online reply language. You can change it in System Settings → Language. Localization is incomplete: some app descriptions, commands, and other text remain English; untranslated labels fall back to English. User content is never automatically translated. If video playback is unavailable, a static English greeting is shown instead. Reduced-motion preferences also use a static greeting. New feature releases play a short hello and show a per-profile What’s New; reopen it from the Canopy menu. To announce a future feature, update the release cards and bump `RELEASE.id` in `index.html`.
- The hello recording was supplied separately in the repository; it is third-party media and is not covered by the project’s Unlicense.
- Fern and Clock share multiple timers. Try “set a timer for 2 minutes called tea”, “pause tea timer”, “resume tea timer”, “how much time is left on the tea timer”, or “cancel all timers”. The active timers and countdown update live in Fern and Clock. Timers without a name refer to the most recent applicable timer.
- Choose a city in Weather or Settings → Location, or explicitly grant current-location access. Weather data comes from Open-Meteo. The Weather live wallpaper follows that location and refreshes periodically. Other animated wallpapers are available in Settings → Wallpaper; reduced-motion preferences are respected.
- Common desktop label translations are adapted from GNOME catalogs; attribution and license texts are in `locales/`.
- Add and remove national public-holiday calendars from Calendar, including the US and China. Holiday data is provided by [date-holidays](https://github.com/commenthol/date-holidays); dates can change, and local subdivisions and official one-off changes may not be represented. See `vendor/holidays.LICENSE.txt` for third-party licenses.
- Canopy Browser includes tabs, favorites, history, a start page and Wikipedia-backed suggestions/results, with a direct web-search link. Sites that prohibit embedding can be opened in the host browser using the persistent button.

## Android Fern assistant

The `android/` project packages this same CanopyOS app and exposes Fern as an Android voice-interaction assistant. After installation, use Fern's Android assistant settings button (or Android's Default apps → Digital assistant app screen) to select it. Android opens Fern from its assistant gesture; always-on wake-word detection is intentionally not enabled. Fern's spoken replies use the app's downloadable Kokoro neural voice offline after first setup, not the phone's installed TTS voice. Incoming speech uses the Android speech-recognition provider, and open-ended answers still require the existing online model service. Build, voice-model size, and third-party license details are in `android/README.md`.

## Web platform limits

Timers are stored per local profile and continue counting down when the apps are closed or the page is away. Alerts appear when CanopyOS is open or reopened; a closed browser cannot deliver a notification at the deadline. Paused timers remain paused.

This is a web app, not a native operating system or a standalone Chromium distribution. It uses the engine of the browser running it and cannot override a site's frame restrictions. Some pages, including many search and sign-in pages, therefore must open in a separate browser tab. Battery, microphone, and geolocation APIs depend on browser support, secure context, and permissions. Open-ended Fern responses and weather require external services and network access; they can be unavailable. Fern’s normal online requests already include conversation text and basic workspace metadata; the note itself is included only when explicitly shared. Restart affects this web app, not the host computer. Location is requested only when you choose to use it, and coordinates are saved in your local profile for weather.

## Workspace features

- Every app can enter CanopyOS full-screen with its green window control or **Ctrl + Shift + F**; use the same control or shortcut to restore it. This fills the CanopyOS workspace, not the browser's native full-screen mode. The Window menu also offers left/right tiling (**Ctrl + Alt + Arrow**).
- Open Launchpad from the menu bar, Canopy menu, or **Ctrl + Shift + A**. Spotlight also searches locally stored notes. **Ctrl/Command + M** minimizes, **Ctrl/Command + W** closes the active window, and **Ctrl + Shift + N** creates a note (browser/OS shortcuts may take precedence).
- Reminders supports locally saved tasks, editing, due dates, optional times, completion and filters. Timed reminders notify once while CanopyOS is open (or when the tab resumes); they cannot alert while the browser is closed. Activity Monitor shows CanopyOS windows, browser connectivity and estimated browser storage, not system-wide processes or CPU usage.
- Click the menu-bar clock for notification history. Focus in Control Center suppresses CanopyOS notification pop-ups during the current session while retaining them in history. Wi-Fi and Bluetooth are managed by the host device, not this web app.

- The translucent Dock supports magnification, size, and optional auto-hide in Settings → Dock. Mission Control (**Ctrl + Shift + M**) lists open and minimized windows; **Ctrl + Shift + D** shows the desktop or restores its windows. The menu bar clock can use 24-hour time.
- Notes can be duplicated and exported as plain text. Calendar events can be edited and exported as an iCalendar file; exported events exclude the separately maintained holiday calendars.

Run `npm install` and `npm test` for the automated workspace smoke tests.
