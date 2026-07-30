# Ustastrikk – web

Web-versjonen av Ustastrikk (Strikkerikke), portert fra SwiftUI-appen i mappa over.
Grunnen til porten: en app sidelastet med gratis Apple-konto må signeres på nytt
hver 7. dag, og krever utviklermodus på telefonen. En nettside slipper begge.

SwiftUI-koden ligger fortsatt i `../Ustastrikk/` som referanse.

## Komme i gang

```sh
npm install
npm run dev      # utviklingsserver på http://localhost:5173
npm run build    # produksjonsbygg til dist/
npm run preview  # se på produksjonsbygget lokalt
```

## Konto og data

Alt innhold ligger på en brukerkonto i Supabase, ikke i nettleseren. Du logger
inn med e-post og passord, og prosjektene følger deg mellom telefon og PC.

- **Tabeller:** `projects`, `rounds` og `row_counter`, alle med radsikkerhet
  (RLS) som låser hver rad til `user_id`. En innlogget bruker når kun sine egne.
- **Bilder:** privat bøtte i Supabase Storage (`prosjektbilder`), under
  `<bruker-id>/<uuid>.jpg`. Vises via signerte URL-er.
- **Oppsett:** `web/.env` peker på Supabase-prosjektet. Fila ligger med vilje i
  git – den publiserbare nøkkelen er laget for å stå åpent i klientkoden, og
  havner uansett i den ferdigbygde JS-fila. Det er RLS som beskytter dataene.

**Appen krever nett.** Uten forbindelse laster skallet, men prosjektene kommer
ikke. Det er et bevisst valg: databasen er eneste kilde til sannhet, så det
finnes ingen lokal kopi som kan komme i utakt.

## Legg til på Hjem-skjerm på iPhone

Appen er en PWA. Åpne siden i Safari → Del → «Legg til på Hjem-skjerm».
Da får den eget ikon og kjører uten nettleserramme. Ingen 7-dagers utløp,
ingen utviklermodus.

Merk: `display: standalone` krever HTTPS (eller localhost). Service workeren
cacher app-skallet for rask oppstart, men ikke dataene – se over.

## Publisering

Rulles ut til GitHub Pages av `.github/workflows/deploy.yml` ved hvert push til
`web`-grenen. Arbeidsflyten kjører `npm ci` og `npm run build` (som typesjekker
først, så en typefeil stopper utrullingen) og publiserer `web/dist`.

`dist/` er helt statisk og trenger ingen server. `base` er satt til `./` og
rutingen er hash-basert, så mappa kan ligge hvor som helst – rot-domene eller
undermappe – uten omkonfigurering.

## Hvordan koden henger sammen med SwiftUI-versjonen

| SwiftUI | Web |
| --- | --- |
| `StrikkeStore` (`@Observable`) | `src/store.ts` (`useSyncExternalStore`) |
| `UserDefaults` | Supabase-tabeller, bilder i Supabase Storage |
| – (ingen innlogging) | `src/auth.ts` + `src/components/Auth.tsx` |
| `Stopwatch`, `Round`, `Project` | `src/model.ts` (samme felt, tid i ms) |
| `ContentView` (TabView) | `src/App.tsx` + hash-ruting |
| `ProsjektListeView` | `src/components/ProjectList.tsx` |
| `ProsjektDetaljView` | `src/components/ProjectDetail.tsx` |
| `OmgangKjorView` | `src/components/KnitMode.tsx` |
| `RadTellerView` | `src/components/RowCounter.tsx` |
| `ConfettiView` | `src/components/Confetti.tsx` (CSS-animasjon) |
| `Fanfare` (generert WAV) | `src/fanfare.ts` (Web Audio-oscillatorer) |
| `Theme` | `src/theme.css` (samme fargeverdier) |
| `TimelineView(.periodic)` | `useNow()` i `src/hooks.ts` |
| `PhotosPicker` | `<input type="file">` + `src/image.ts` |
| `NavigationStack` | hash-ruter, så tilbake-knapp og iOS-sveip virker |

## Bevisste forskjeller

- **Konto og synk.** iOS-appen lagret alt lokalt i `UserDefaults`. Web-versjonen
  krever innlogging og lagrer i Supabase, slik at de samme prosjektene finnes på
  telefonen og PC-en. Prisen er at appen ikke virker uten nett.
- **Bilder i Supabase Storage.** Bildene skaleres fortsatt til 1200 px JPEG (som
  i Swift-koden), men lastes opp i stedet for å lagres lokalt, så de følger
  kontoen til en ny enhet.
- **Omganger flyttes med piltaster** i stedet for dra-og-slipp. SwiftUI hadde
  `.onMove` med `EditButton`; HTML-ens dra-og-slipp fungerer ikke på iOS-touch.
- **Slett prosjekt** ligger som en knapp nederst på prosjektsiden, med
  bekreftelse, i stedet for sveip-for-å-slette i listen.
- **Skjermen holdes våken** i strikkemodus og mens rad-telleren går
  (Screen Wake Lock API). Det hadde ikke iOS-appen, men det er nyttig her.
- **`<meta name="darkreader-lock">`** i `index.html` ber Dark Reader-utvidelsen
  la fargene være, siden appen har en bevisst lys palett (som
  `.preferredColorScheme(.light)`). Slett linja hvis du vil ha mørk modus.
- **Rad-telleren er felles** for alle prosjekter. Det er ikke en endring –
  iOS-appen gjorde det samme – men det er lett å misforstå.

## Ting som ikke er portert

- Widgets, varsler og annet som krever en native app. Ingen av dem fantes i
  iOS-appen heller.
