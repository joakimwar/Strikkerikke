# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

Ustastrikk (also called Strikkerikke) is a knitting counter app. It exists twice:

- `Ustastrikk/` — the original SwiftUI iOS app. **Reference only, not the active
  target.** Kept because it is the source of truth for behaviour, wording and colours.
- `web/` — the active version, a React + Vite PWA ported from the Swift code.

The port happened because sideloading with a free Apple account requires re-signing
every 7 days and developer mode on the device. Prefer changing `web/`; only touch the
Swift code if the user explicitly asks about the iOS app.

**The UI is entirely in Norwegian (bokmål), and so are the code comments.** Match this
when adding anything user-facing or commenting new code. Existing Norwegian domain
terms: *omgang* (round), *rad* (row), *prosjekt*, *strikketid* (knitting time),
*mønster* (pattern), *fullfør* (complete), *nullstill* (reset), *angre* (undo).

## Commands

All commands run from `web/`:

```sh
npm install
npm run dev        # dev server, localhost:5173 by default
npm run build      # tsc -b && vite build -> dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
```

To reach the dev server from a phone on the same Wi-Fi:
`npm run dev -- --host 0.0.0.0`. Note that over plain `http://` the service worker
will not register and the wake lock will not engage — both need a secure context, so
offline and screen-on can only be verified over HTTPS or on localhost.

There is no test suite and no linter configured. `npm run build` (which typechecks
first) is the only automated gate. Verification of behaviour has been done by driving
the app in a browser.

`web/.env` holds the Supabase URL and publishable key and **is committed on purpose**
— see the comment in the file. The service_role key must never go there; it bypasses
RLS.

Pushing to the `web` branch deploys to GitHub Pages via
`.github/workflows/deploy.yml`. Schema changes go through the Supabase MCP
(`apply_migration`), not a local CLI — `supabase` is not installed here.

The Xcode project builds for iOS/macOS/visionOS with bundle id `none.Ustastrikk` and
has no test targets.

## Where it runs

| | |
| --- | --- |
| Live site | <https://joakimwar.github.io/Strikkerikke/> |
| Repo | `joakimwar/Strikkerikke`, default branch `web`, **public** |
| Supabase project | `Strikketrikke`, ref `vrmtxpezbicynkcirzoz`, region eu-central-1 |

Three names for one app, and they do not match: the Xcode target is **Ustastrikk**,
the repo and the login screen say **Strikkerikke**, and the Supabase project is
**Strikketrikke**. Nothing depends on them agreeing — just do not assume a search for
one name finds the others.

The repo is public because GitHub Pages only serves from public repos on a free
account. That is why nothing secret may enter this repository.

### The free-tier pause is the first thing to check when data will not load

**Supabase pauses free-plan projects after ~7 days of low activity.** A few database
requests a day is enough to prevent it. Two other projects in this org are already
paused, and the org is capped at 2 active projects.

When it happens, the *site* stays up — Pages has no expiry and is unaffected — but
every API call fails, so the app lands on the "Fikk ikke tak i dataene" screen with
its "Prøv igjen" button. That screen is the error path working correctly, **not a
bug**. Before debugging any code that reports failing requests or a stuck loading
state, check whether the project is paused (`get_project` via the Supabase MCP, or
the dashboard) and restore it if so.

Pausing does **not** delete data: a restored project comes back with its data and
configuration intact, and there is a 1-year window to restore it. Data is only at
risk if the project sits paused for over a year.

Quotas are not a concern at this scale — 500 MB database, 1 GB file storage, 5 GB
egress, 50k monthly active users. Photos are downscaled to ~200–400 kB, so file
storage is the first thing that would bind, at a couple of thousand project photos.

There is no keep-warm job. If the pausing becomes annoying, the options are a
scheduled workflow that pings the REST API daily, or the Pro plan; do not add one
without asking, since it is a deliberate open question.

## Architecture

### State lives in one mutable store, not in React state

`src/store.ts` holds a single module-level `state: State` object with a `Set` of
listeners, exposed to React through `useSyncExternalStore`. This is a direct port of
the Swift `@Observable StrikkeStore`. Consequences worth knowing before changing it:

- **Every mutation goes through `actions`.** Each action builds a new `State`, calls
  `commit()`, which notifies listeners, and separately sends the change to Supabase.
  Never mutate `state` in place.
- `useStore()` returns the whole state, so any change re-renders every subscriber.
  That is fine at this size and deliberately kept simple.
- `getSnapshot` must keep returning a stable reference between commits, so do not
  build derived objects there.

### Persistence is Supabase, and the app is online-only

There is no `localStorage` copy of the data and no offline mode. The in-memory
`state` is a cache of the database, hydrated once per login.

- **State** (projects, rounds, counters, stopwatches) → the `projects`, `rounds` and
  `row_counter` tables, all with RLS locking every row to `user_id`.
- **Photos** → the private `prosjektbilder` bucket in Supabase Storage, under
  `<user-id>/<uuid>.jpg`, with the path stored on the project as `photoPath`.
  Storage policies check that the first folder segment is the caller's own id, so
  the bucket needs signed URLs to display (`usePhotoUrl`).

Writes are **optimistic**: `commit()` updates local state immediately so buttons feel
instant, and the network call runs in the background. If it fails, `state.saveError`
is set and stays set — the screen no longer matches the database, so the banner in
`App.tsx` offers a reload rather than silently retrying. Do not "fix" this by clearing
the error on the next successful write; that hides real divergence.

Two things are easy to get wrong here:

- **Photos must be deleted explicitly.** Rounds cascade when a project is deleted,
  storage objects do not. `actions.setPhoto` and `actions.deleteProject` both remove
  the old blob; leaving orphans is the easy mistake.
- **Text fields debounce, progress coalesces.** `setName`/`setNotes`/`setRoundPattern`
  would otherwise issue one request per keystroke, and rapid taps on "Fullfør omgang"
  or "+1" would fire concurrent updates that can land out of order. Both go through
  `debounce(key, …)`, which always writes the *current* state at flush time, so the
  last write wins by construction. `flushPending()` runs on `visibilitychange` and
  `pagehide` (iOS does not reliably give us `beforeunload`) and before sign-out.

`src/database.types.ts` is generated from the schema — regenerate it rather than
hand-editing when you change tables.

### Stopwatches store a start timestamp, not a tick count

`src/model.ts` defines `Stopwatch` as `{ accumulated, startedAt }` and pure functions
(`elapsed`, `start`, `pause`, `restart`) rather than a running counter. Nothing
increments on an interval — the displayed value is computed from `Date.now()`. This is
why time survives reloads and backgrounding, and why **the store is only written on
start/pause, not once per second.**

Rendering the ticking value is a separate concern: `useNow(active)` in `src/hooks.ts`
re-renders once a second and *only while `active` is true* (ports
`TimelineView(.periodic)`). It also resyncs on `visibilitychange`, because iOS freezes
timers in background tabs. Keep the `active` flag honest or you will burn battery on a
static screen.

Time is in **milliseconds** here; the Swift version used seconds.

### Routing is hash-based, and that is load-bearing

`src/App.tsx` plus `useHashRoute()` implement routing over `window.location.hash`
(`#/prosjekter`, `#/prosjekter/:id`, `#/prosjekter/:id/strikk`, `#/rad`) with no
router dependency. Two reasons, both of which break if you switch to path routing:

1. Browser back and the iOS back-swipe work, replacing `NavigationStack`.
2. Combined with `base: './'` in `vite.config.ts`, `dist/` runs from **any**
   subdirectory with no rebuild or server rewrite rules.

### Knit-mode timer is tied to mount/unmount

`KnitMode` uses `useMountEffect` to start the project stopwatch on entry and pause it
on exit, mirroring SwiftUI's `.onAppear`/`.onDisappear`. `App.tsx` passes
`key={project.id}` so switching projects remounts and the timer bookkeeping stays
correct. Under StrictMode the effect runs twice in dev; that is harmless because
start→pause→start accumulates ~0ms.

### Auth gates the whole app

`src/auth.ts` mirrors the Supabase session into React the same way the store does.
`store.ts` subscribes to `onAuthStateChange` itself and hydrates or clears on user
change — that keeps the dependency one-way (`store → supabase`, `auth → store`) with
no cycle. The guard `if (id === userId) return` matters: token refreshes fire the same
event and would otherwise re-hydrate every hour.

`App.tsx` renders one of four things, in order: config error, session-loading blank,
`AuthScreen`, or the app. Supabase's error strings are English; `norwegianError()`
maps the common ones and falls back to a generic message rather than leaking
internals.

### Service worker precaches the shell, not the data

`public/sw.js` reads `index.html` at install time, regexes out the hashed `.js`/`.css`
filenames and caches them. This is not incidental: on a first visit the worker is not
yet controlling the page, so those asset requests bypass it entirely, and without this
step the app rendered a **blank page offline**. Parsing the HTML also avoids keeping a
hash list in sync with the build. Bump `CACHE` when changing the worker.

Navigation is network-first (so a deploy is picked up); everything else is cache-first.
The `url.origin !== self.location.origin` check means Supabase calls are never
intercepted — that is what keeps a stale cache from serving stale project data.
Deliberate: the worker buys fast startup, not offline use.

### Ports of the fancy bits

- **Confetti** (`components/Confetti.tsx`) — 340 CSS-animated pieces, every ~5th a
  🐶 or 🧶, generated once via `useMemo` so they do not reshuffle on re-render.
  Positioned `absolute` inside `.app` so it does not escape the column on desktop.
  Hidden under `prefers-reduced-motion`.
- **Fanfare** (`src/fanfare.ts`) — the same C5→E5→G5→C6 arpeggio as `Fanfare.swift`,
  rebuilt on Web Audio oscillators instead of a hand-assembled WAV. Must be triggered
  from a user gesture or the browser blocks it; it is called from the button handler
  for exactly that reason. Resumes a suspended `AudioContext` (iOS suspends it).
- **Icons** (`src/icons.tsx`) — hand-written 24×24 stroke SVGs replacing SF Symbols.
  There is no icon library; add new ones here in the same style.

### Styling

`src/theme.css` is plain CSS with custom properties, no framework. The palette is
copied numerically from `Theme.swift` (cream `#f5edd9`, teal `#3da8b0`, caramel
`#c7804a`, sage `#85a16b`) and derives from the app icon. The app is **locked to
light** (`color-scheme: light`), matching `.preferredColorScheme(.light)`, and
`index.html` carries `<meta name="darkreader-lock">` so the Dark Reader extension
does not turn the cream palette to mud. Rounded type comes from the CSS `ui-rounded`
generic family, which Safari supports — not a downloaded webfont.

## Deliberate differences from the iOS app

Do not "fix" these back:

- Rounds reorder with up/down arrow buttons, not drag-and-drop — HTML5 drag does not
  work on iOS touch. Replaces `.onMove` + `EditButton`.
- Delete-project is a confirmed button at the bottom of the detail screen, not
  swipe-to-delete in the list.
- Screen wake lock while knitting and while the row counter runs. The iOS app had no
  equivalent.
- The row counter is **shared across all projects**, not per-project. This looks like
  a bug and is not — the Swift version did the same. It is one row per user in
  `row_counter`, upserted because the row is created lazily on first use.
- Accounts and cloud sync. The iOS app was local-only; the web version requires a
  login because the whole point was getting the same projects on phone and laptop.
