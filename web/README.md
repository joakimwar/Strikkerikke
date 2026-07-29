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

## Legg til på Hjem-skjerm på iPhone

Appen er en PWA. Åpne siden i Safari → Del → «Legg til på Hjem-skjerm».
Da får den eget ikon, kjører uten nettleserramme, og virker offline.
Ingen 7-dagers utløp, ingen utviklermodus.

Merk: `display: standalone` og offline-cachen krever HTTPS (eller localhost).
På `http://` fungerer appen fint, men uten offline-støtte.

## Publisering

`dist/` er helt statisk og trenger ingen server. `base` er satt til `./` og
rutingen er hash-basert, så mappa kan ligge hvor som helst – rot-domene eller
undermappe – uten omkonfigurering. Testet fra en undermappe.

Fungerer på GitHub Pages, Netlify, Cloudflare Pages, eller en vanlig webserver.

## Hvordan koden henger sammen med SwiftUI-versjonen

| SwiftUI | Web |
| --- | --- |
| `StrikkeStore` (`@Observable`) | `src/store.ts` (`useSyncExternalStore`) |
| `UserDefaults` | `localStorage` for tilstand, IndexedDB for bilder |
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

- **Bilder i IndexedDB.** Bildene skaleres til 1200 px JPEG (som i Swift-koden),
  men lagres som Blob i IndexedDB i stedet for base64 i `localStorage`. Et bilde
  blir fort et par hundre kB, og `localStorage` sprekker rundt 5 MB.
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
