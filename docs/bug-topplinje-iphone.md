# Topplinja forsvinner i hjem-app-versjonen på iPhone

**Status:** uløst, lagt til side med vilje. Garnlageret er ferdig og fungerer;
denne feilen ble oppdaget underveis og skal tas senere.

**Diagnosekoden ligger på branchen `diag/iphone-topplinje`** (siste commit
`969ef87`). Den er reversert ut av `web` i commit `2cdbd7c`. Hent den tilbake med
`git cherry-pick` derfra når arbeidet gjenopptas.

## Hva som skjer

I appen lagt til på Hjem-skjermen blir innholdet i topplinja usynlig: tittelen
(«Prosjekter», «Garnlager») og knappene oppe til høyre (`+` og person-ikonet).
Linja er tom. Zoomer du ut med to fingre, kommer alt tilbake med én gang.

Det ser ut som om siden er zoomet inn, men den er ikke det — det er målt.

## Betingelser

Alle tre må være oppfylt. Det er dette som gjør feilen vanskelig å treffe:

| Betingelse | Merknad |
| --- | --- |
| Standalone-modus | Kun via ikonet på Hjem-skjermen. I Safari med adresselinje skjer det aldri. |
| Siden kan ikke scrolles | Med nok prosjekter eller garn til at det blir scroll, skjer det ikke. |
| Etter at tastaturet har vært oppe | Utløses av å legge inn nytt prosjekt eller garn, altså dialogen med tekstfelt. |

De to første henger trolig sammen: uten adresselinje er det mer vertikal plass,
så siden slutter å scrolle. Det er sannsynligvis én betingelse, ikke to.

Feilen kom med garnlager-endringene (`3427496`). Nøyaktig hva i dem som utløser
den er **ikke** funnet.

## Målinger fra enheten

Tatt i standalone-modus på iPhone (393×793 pt) via diagnoseskjermen:

```
modus: STANDALONE (hjem-app)
safe-area topp: 0.0px
zoom: 1.000
vindu: 393x793
synlig felt: 393x793 @0,0
dokument b/h: 393/793 vs 393/793
kan scrolle: NEI
topplinje x,y,b,h: 0,0,393,58
tittel x,y,b: 8,11,279
knapper x,y,b: 295,10,90
synlighet: sticky z10 op1 visible
```

## Hva som er utelukket

Dette er avkreftet med målinger, ikke antatt:

- **Zoom.** `zoom: 1.000` og `synlig felt @0,0`. Siden er ikke skalert i det hele
  tatt, og er ikke forskjøvet.
- **Vannrett overflyt.** `dokument 393/793 vs 393/793`. Ingenting stikker ut i
  siden og dytter knappene ut av syne.
- **Layout.** Topplinja er 393×58 på posisjon 0,0. Tittelen er 279px bred,
  knappene 90px og starter på x=295 — altså godt innenfor skjermen.
- **Synlighet i CSS.** `opacity: 1`, `visibility: visible`, `z-index: 10`.
- **For liten skrift i skjemafelt.** Dette var den første hypotesen, og den var
  feil. Se under.

## Konklusjon så langt

Elementene ligger nøyaktig der de skal, med riktige mål og full synlighet — de
blir bare ikke **tegnet**. Alt som tvinger fram en ny opptegning (zooming,
scrolling) får dem tilbake.

Det peker på en opptegnings- eller lagfeil i WebKit rundt `position: sticky`,
ikke på noe galt i layouten vår.

## Feilspor: skriftstørrelsen (ikke årsaken)

Første hypotese var at Safari zoomer inn når et skjemafelt med skrift under 16px
får fokus. `.select` lå på 15px. Den ble hevet til 16px i commit `2d219f1`, og
`.dialog__input` fra 16px til 17px.

**Det fikset ikke feilen**, og målingen viste etterpå at siden aldri var zoomet.

Endringen er beholdt likevel, fordi 16px-grensen er reell og verdt å følge på
egne premisser — men den må ikke forveksles med en løsning på denne feilen.

## Sjekket og funnet uskyldig

- **Supabase.** 100 forespørsler siste døgn, alle 2xx. «Fikk ikke lagret»-banneret
  som dukket opp én gang var et nettverksglipp på telefonen, ikke en serverfeil.
  Feilhåndteringen virket som den skulle.
- **Service workeren.** Navigasjon går mot nett først, og nye byggefiler har ny
  hash i navnet, så en vanlig omlasting henter ny versjon. Mellomlagring blokkerte
  ikke fiksene. Merk at iOS kan gjenopprette hjem-appen fra et øyeblikksbilde uten
  å gå på nett — lukk den helt i app-veksleren for å være sikker på ny kode.

## Neste steg

Ikke gjett videre. Det er gjettet feil to ganger allerede; begge gangene løste
måling det som resonnering ikke klarte.

1. **Bekreft utløseren.** Hent diagnoseskjermen fra `diag/iphone-topplinje` og
   gjør den ferdig: den halvferdige delen åpner en ekte dialog på selve
   diagnosesiden, slik at tastaturet kommer opp og feilen kan gjenskapes der
   tallene vises. Uten det er «tastaturet utløser den» fortsatt bare sannsynlig.
2. **Prøv kandidatfiksene på enheten**, ikke lokalt:
   - Tving topplinja inn i sitt eget lag.
   - Tving fram en ny opptegning når `visualViewport` endrer seg, altså når
     tastaturet lukkes.
3. **Vurder å droppe `position: sticky` når siden ikke kan scrolles.** Sticky har
   ingen synlig effekt da uansett, så det er visuelt identisk og går utenom feilen
   helt.

### Fallgruve å huske

`transform` eller `will-change` på `.navbar` gjør den til containing block for
etterkommere med `position: fixed`. `.scrim` inne i konto-menyen er nettopp det,
og ville da slutte å dekke hele skjermen. Legg lagfiksen et annet sted, eller
flytt scrimen ut av topplinja først.

## Hvis feilen blir plagsom før den er løst

Åpne siden i Safari i stedet for via ikonet på Hjem-skjermen. Der skjer den ikke.
