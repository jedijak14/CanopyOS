# CanopyOS — Feature List

CanopyOS is a desktop operating system that runs entirely in the browser: plain ES
modules, hand-authored CSS and inline SVG, no framework, no build step, no Apple assets.
This file enumerates **130 implemented features**, each one present in the repository and
exercised by the automated test suite (`npm test`).

Legend: ⌘ is the Command key on macOS and Ctrl on Windows/Linux.

---

## A. Window management (1–20)

1. **Floating window manager** — every app opens in its own draggable, resizable window with independent z-order.
2. **Title-bar dragging** with pointer capture; the window follows the cursor and is clamped back on screen.
3. **Drag from a maximized window** — the window un-zooms and re-flows under the cursor at the same relative position.
4. **Eight-way resize** — north, south, east, west and all four corners, each with a minimum size per app.
5. **Traffic-light controls** — close, minimize and zoom buttons drawn as original SVG glyphs.
6. **Double-click the title bar** to zoom/un-zoom a window.
7. **Zoom to work area** — maximized windows respect the menu bar height.
8. **Edge snapping** — drag to the left or right screen edge to snap into a half-screen tile.
9. **Drag-to-top maximize** — dragging a window to the top edge maximizes it on release.
10. **Snap preview overlay** — a translucent target rectangle shows exactly where the window will land.
11. **Tile all windows** — Lay out every visible window in an even grid from the Window menu.
12. **Genie minimize** — windows shrink into the Dock with a CSS transform animation.
13. **Restore from the Dock** — click a running app's Dock icon to bring its windows back.
14. **Focus and inactive styling** — unfocused windows dim their chrome and lose their shadow.
15. **Cascade placement** — new windows are staggered diagonally so they never stack exactly.
16. **Per-window toolbars** — apps inject their own toolbar controls into the window chrome.
17. **Per-window status bars** — Preview, Browser, Code and Activity render live status/footer rows.
18. **Virtual desktops (Spaces)** — three desktops by default, add or remove them from Mission Control.
19. **Mission Control** — live, scaled, clickable thumbnails of every window plus per-window close buttons.
20. **Keep-on-screen resize handling** — resizing the viewport re-clamps and re-fits open windows.

## B. Window & app switching (21–26)

21. **App switcher overlay (⌘Tab)** — cycling through running apps with their icons and titles.
22. **Switcher keyboard model** — Tab/Shift-Tab to move, Enter to commit, Escape to cancel.
23. **Space switching (⌃← / ⌃→)** with a whoosh sound.
24. **Window cycling** — Window menu entries cycle the front window through the stack.
25. **Close window (⌘W)**, **minimize (⌘M)**, **quit app (⌘Q)**, **new window (⌘N)**.
26. **Window event bus** — `canopy:win` / `canopy:focus` events keep the Dock, menus and Mission Control in sync.

## C. Menu bar (27–38)

27. **Application menu bar** at the top of the screen, rendered per app.
28. **Apple-logo replacement** — an original Canopy glyph opens the system menu.
29. **Dynamic app menus** — each app can expose `menus` as data or as a function of the focused window.
30. **Menu items with shortcuts** — shortcut labels right-aligned in monospace.
31. **Menu separators, disabled items and checkmarks**.
32. **Full keyboard navigation** — ArrowUp/ArrowDown/Enter/Escape with a highlighted row.
33. **Edge-flip positioning** — menus flip and clamp so they never leave the viewport.
34. **Click-outside dismissal** and Escape handling.
35. **Status items** — Wi-Fi, battery, volume and Control Center triggers, all original SVG.
36. **Live menu-bar clock** with optional seconds, 24-hour clock and date.
37. **Notification Center trigger** in the status area.
38. **About This Canopy** panel showing version, storage usage and credits.

## D. Dock (39–52)

39. **Dock** pinned to the bottom by default, floating over the wallpaper with a glass background.
40. **Pinned apps** — Finder, Launchpad, Terminal, Notes, Mail, Calendar, Photos, Music, Paint, App Store, Settings.
41. **Hover magnification** — neighbouring icons scale with a smooth falloff.
42. **Tooltips** — app names appear above the icon on hover.
43. **Running indicators** — a dot under every open app.
44. **Minimized indicator** — apps whose windows are all minimized show a hollow dot.
45. **Badges** — unread Mail, due Reminders and Trash contents are counted, capped at “99+”.
46. **Unpinned running apps** appear automatically next to the pinned set.
47. **Separators** grouping pinned, running and special items.
48. **Trash** icon that opens the Finder at `/Trash`.
49. **Dock context menus** — New Window, Show All Windows, Keep in Dock, Quit.
50. **Auto-hide Dock** with a reveal strip at the screen edge.
51. **Dock position** — bottom, left or right, set in Settings.
52. **Resizable Dock** — 40–80 px icon size slider applied live.

## E. Desktop, widgets & Spaces (53–68)

53. **Desktop icons** for the files and folders in `~/Desktop`, drawn with original file/folder SVG art.
54. **Icon selection**, double-click to open, Enter to open, Backspace to trash, and per-icon context menus.
55. **Desktop context menu** — New Folder, New File, Change Wallpaper, Sort By, Show/Hide Widgets.
56. **Sort desktop icons** by name, kind or date.
57. **Widget panel** on the right edge of the desktop.
58. **Clock widget** with date.
59. **Weather widget** driven by the same weather engine as the Weather app.
60. **Calendar widget** highlighting today.
61. **Notes widget** showing the latest note.
62. **Reminders widget** with inline check-off that writes through to the Reminders app.
63. **System widget** showing battery/energy and network state.
64. **Widget toggle** — hide the entire widget column from Settings or the desktop menu.
65. **Eight original wallpaper gradients** — Canopy, Aurora, Sunset, Ocean, Graphite, Bloom, Forest, Mono.
66. **Custom gradient wallpaper builder** — pick an angle and two colours in Settings.
67. **Night Shift** — warm tint layer over the wallpaper, toggleable in Settings.
68. **Wallpaper tint slider** for extra contrast control over icon-heavy desktops.

## F. Search, launching & discovery (69–80)

69. **Spotlight (⌘K)** — one search box for apps, files, folders, calculations and answers.
70. **Fuzzy app matching** with keyboard selection and Enter to launch.
71. **File and folder results** that open directly in Finder, TextEdit or Preview.
72. **Inline calculator** — `12 * (3 + 4)` returns `84`, and `15% of 240` returns `36`.
73. **Unit conversions** — length, mass, volume, data and speed units.
74. **Temperature conversion** — `72f to c` returns `22.22°C`.
75. **Currency conversion** with indicative reference rates (`100 usd to eur`).
76. **World-clock answers** — `time in Tokyo` resolves against the same city table as Weather and Clock.
77. **Launchpad** — full-screen app grid with original icons.
78. **Launchpad search** that filters the grid as you type.
79. **Launchpad paging** with page dots and arrow-key navigation.
80. **Keyboard shortcuts cheat sheet (⌘/)** listing every global binding.

## G. Control Center & notifications (81–92)

81. **Control Center popover** anchored under the menu bar.
82. **Wi-Fi, Bluetooth and AirDrop toggles** that persist.
83. **Do Not Disturb / Focus** toggle that suppresses banners.
84. **Display brightness slider** wired to the brightness veil and wallpaper filter.
85. **Output volume slider** wired to the synthesized sound engine.
86. **Dark mode quick toggle**.
87. **Now-playing card** with artwork, title, artist and play/pause.
88. **Notification Center** sliding panel from the right edge.
89. **Notification list** with app icon, title, body and relative timestamps.
90. **Clear all** notifications with one button.
91. **Notification widgets** (clock and calendar) inside Notification Center.
92. **Toast banners** that auto-dismiss, stack, and can be clicked to open the source app.

## H. Session, power & system (93–103)

93. **Boot sequence** with animated Canopy logo, progress bar and staged status text.
94. **Lock screen** with large clock, date, avatar, password field and unlock animation.
95. **Optional password** for unlocking (setting is stored locally).
96. **Auto-lock** after a configurable idle period.
97. **Sleep** — black screen; any key or click wakes the session.
98. **Restart** flow that re-runs the boot sequence.
99. **Shut down** with a power-on button that boots the machine again.
100. **Welcome notification** on first boot with a tour of ⌘K and Terminal.
101. **Session uptime**, user name and avatar initial in About.
102. **Storage estimate** using the browser's storage API, falling back to filesystem size.
103. **Crash surfacing** — uncaught errors and rejected promises are logged with context.

## I. Sound & feedback (104–110)

104. **Synthesized UI sounds** via WebAudio — no audio files shipped.
105. **Distinct cues** for open, close, minimize, snap, click, success, error, chime and swish.
106. **Sound on/off** and volume applied to every cue.
107. **Autoplay-policy handling** — the audio context unlocks on the first gesture.
108. **Visual feedback** — button press states, drag states, and focus rings throughout.
109. **Hover and active states** for every interactive surface.
110. **Reduced motion** honored from the OS media query and a Settings switch.

## J. Appearance & accessibility (111–121)

111. **Light, dark and auto themes**, applied before first paint.
112. **Ten accent colours** that retheme buttons, selections, sliders and focus rings.
113. **Transparency toggle** for menu, Dock and window blur.
114. **Increase contrast** mode with stronger borders and text.
115. **Interface font size** slider (11–17 px).
116. **Window corner radius** slider (0–22 px).
117. **Pointer size** — a large highlighted cursor ring for easier tracking.
118. **Reduce motion** switch that removes transitions globally.
119. **Menu-bar clock preferences** — 24-hour, seconds, date.
120. **Keyboard-only operation** for menus, Spotlight, Launchpad, switcher and dialogs.
121. **ARIA labelling** on windows, buttons, dialogs, menus and icon-only controls.

## K. File system & shell (122–126)

122. **Persistent virtual file system** in `localStorage` with folders, files, metadata and a Trash.
123. **Terminal** with ~45 commands: `ls, cd, pwd, cat, touch, mkdir, rm, rmdir, mv, cp, tree, find, du, open, edit, wc, head, tail, grep, whoami, hostname, uname, date, uptime, df, ps, neofetch, theme, wallpaper, notify, say, clear, history, exit, fortune, cowsay, banner, matrix, weather, stock, calc, joke`.
124. **Terminal conveniences** — Tab completion, ↑/↓ history, Ctrl+L clear, Ctrl+C cancel, colour output.
125. **Terminal ↔ GUI integration** — `open` and `edit` launch the right app on the right path.
126. **Shared open-with logic** so Finder, Spotlight, Desktop, Terminal and Preview all route files consistently.

## L. Built-in apps (127–…)

127. **Finder** — sidebar places, icon/list/gallery views, breadcrumb path bar, search, new folder, new file, rename, duplicate, move to Trash, empty Trash, sortable columns, Quick Look and Get Info.
128. **Terminal** — see 123–125.
129. **Notes** — folders, rich plain-text editing, search, pinning, auto-save, delete.
130. **TextEdit** — open/save documents, word and character counts, font control, wrap toggle, unsaved-changes guard.
131. **Preview** — Markdown rendering, page thumbnails, pagination, zoom (50–250 %) with ⌘-wheel, export, open in TextEdit.
132. **Calculator** — basic and scientific modes, memory keys, history tape, keyboard support, copy result.
133. **System Settings** — Appearance, Desktop, Dock, Accessibility, Sound, Network, Notifications, Users, Privacy, About panes.
134. **Calendar** — month grid, mini month picker, multiple calendars with colour dots, event create/edit/delete, day detail panel, upcoming list.
135. **Mail** — Inbox/Starred/Sent/Drafts/Trash, search, read/unread, star, compose, reply, forward, attachments stub, unread badge.
136. **Messages** — conversation list, search, chat bubbles, typing indicator, simulated replies, unread counts.
137. **Contacts** — letter-grouped list, favourites, detail card, copy email/phone, edit, create, delete.
138. **Reminders** — smart lists (Today, Scheduled, All, Completed), custom lists, priorities, notes, progress ring, inline rename.
139. **Photos** — deterministic generated artwork, grid with hover actions, lightbox with six filters, favourite, delete, slideshow, save to disk.
140. **Music** — library, albums, artists, playlists, queue, shuffle/repeat, seek, volume, live spectrum visualiser.
141. **Weather** — ten cities, 24-hour hourly strip, seven-day forecast, detail tiles, °F/°C, add/remove cities, condition artwork.
142. **Clock** — analogue world clocks across time zones, alarms with weekday toggles, stopwatch with laps, countdown timers.
143. **Maps** — pan/zoom vector map, three styles, a dozen fictional places, search, pins, route drawing, place cards.
144. **Stocks** — watchlist with add/remove, SVG sparklines, large chart, 1D/1W/1M/3M ranges, market indices, live ticks, news.
145. **Dictionary** — 35 entries, fuzzy suggestions, part of speech, examples, synonyms/antonyms, pronunciation via speech synthesis, history, save to Notes.
146. **Activity Monitor** — CPU, memory, energy, network and disk tabs, live canvas graphs, process table with PID/kill, session uptime.
147. **Screenshot** — full screen, area selection, window capture, countdown, gallery, save to ~/Pictures, graceful fallback capture.
148. **Paint** — brush, marker, eraser, line, rectangle, ellipse, spray, flood fill, 14-colour palette plus custom colour, size control, undo/redo, export.
149. **Code** — project tree, syntax highlighting, line numbers, Ln/Col status, tab insertion, ⌘S save, live iframe preview, open preview in Browser.
150. **Browser** — tabs, back/forward, canopy:// start page, bookmarks, history, in-app file rendering, external pages in a sandboxed frame.
151. **Voice Memos** — real microphone recording with waveform, simulated fallback, memo list with play/rename/delete.
152. **App Store** — categories, search, featured app, install progress that adds apps to the Dock.
153. **Minesweeper** — three difficulties, first-click safety, flags, chord reveal, timer, best times.
154. **2048** — slide/merge, undo, keyboard and swipe input, best score.
155. **Snake** — three speeds, pause, D-pad, best score.
156. **Memory** — eight icon pairs, move/time counters, best score, win overlay.

## M. Developer experience (157–162)

157. **No build step** — open `index.html` from any static server and the OS runs.
158. **Zero runtime dependencies** — the only dev dependency is jsdom for tests.
159. **Static module-graph verifier** (`npm run test:static`) that resolves every relative import and checks each named export exists.
160. **Headless integration suite** (`npm run test:unit`) that boots the real OS in jsdom and opens all 29 apps.
161. **Static file server** (`npm start`) with correct MIME types and path-traversal protection.
162. **Original assets only** — every icon, glyph, wallpaper and illustration is inline SVG or CSS authored for this project.

---

Count: **162 features** across the shell, the system services and 29 applications.
