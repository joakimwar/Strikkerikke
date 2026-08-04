/**
 * Midlertidig diagnoseskjerm på #/diag. Ikke lenket fra noe sted i appen.
 *
 * Finnes fordi en feil bare viser seg på iPhone: topplinja blir usynlig når
 * siden er kort nok til at den ikke kan scrolles, og kommer tilbake hvis du
 * zoomer ut. Den lar seg ikke gjenskape i en nettleser på Mac eller PC, så vi
 * trenger de faktiske tallene fra telefonen for å skille mellom tre helt ulike
 * årsaker:
 *
 *   1. Siden er skalert (zoom)      → visualViewport.scale er ikke 1
 *   2. Innholdet er skjøvet sidelengs → scrollWidth > clientWidth
 *   3. Elementene ligger riktig, men males ikke → alle tall stemmer likevel
 *
 * Nummer 3 er den vi mistenker, og den kan bare påvises ved at topplinjas
 * koordinater er riktige samtidig som den er usynlig på skjermen.
 *
 * Slett hele fila igjen når feilen er ute av verden.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Person, Plus } from '../icons'
import { Menu, MenuItem, Navbar } from './chrome'

type Rad = { navn: string; verdi: string; mistenkelig?: boolean }

/** Leser av alt vi trenger i ett øyeblikk. */
function måling(navbar: HTMLElement | null): Rad[] {
  const doc = document.documentElement
  const vv = window.visualViewport

  const rader: Rad[] = [
    { navn: 'Skjerm (innerWidth × innerHeight)', verdi: `${window.innerWidth} × ${window.innerHeight}` },
    {
      navn: 'Zoom (visualViewport.scale)',
      verdi: vv ? vv.scale.toFixed(3) : 'ikke støttet',
      // Alt annet enn 1 betyr at siden faktisk er skalert.
      mistenkelig: vv ? Math.abs(vv.scale - 1) > 0.001 : false,
    },
    {
      navn: 'Synlig felt (visualViewport)',
      verdi: vv ? `${Math.round(vv.width)} × ${Math.round(vv.height)}` : '–',
    },
    {
      navn: 'Forskyvning (visualViewport offset)',
      verdi: vv ? `venstre ${Math.round(vv.offsetLeft)}, topp ${Math.round(vv.offsetTop)}` : '–',
      mistenkelig: vv ? vv.offsetLeft !== 0 || vv.offsetTop !== 0 : false,
    },
    {
      navn: 'Bredde: dokument vs. vindu',
      verdi: `${doc.scrollWidth} vs. ${doc.clientWidth}`,
      // Større dokument enn vindu = noe stikker ut i siden.
      mistenkelig: doc.scrollWidth > doc.clientWidth,
    },
    {
      navn: 'Høyde: dokument vs. vindu',
      verdi: `${doc.scrollHeight} vs. ${doc.clientHeight}`,
    },
    {
      navn: 'Kan siden scrolles?',
      verdi: doc.scrollHeight > doc.clientHeight ? 'JA' : 'NEI',
    },
    { navn: 'Rullet ned (scrollY)', verdi: String(Math.round(window.scrollY)) },
  ]

  if (navbar) {
    const r = navbar.getBoundingClientRect()
    const tittel = navbar.querySelector('.navbar__title')?.getBoundingClientRect()
    const høyre = navbar.querySelector('.navbar__trailing')?.getBoundingClientRect()
    const stil = window.getComputedStyle(navbar)

    rader.push(
      { navn: '— topplinja over —', verdi: '' },
      {
        navn: 'Topplinje (x, y, bredde, høyde)',
        verdi: `${Math.round(r.x)}, ${Math.round(r.y)}, ${Math.round(r.width)}, ${Math.round(r.height)}`,
        // Ligger den utenfor skjermen, er det layout og ikke maling.
        mistenkelig: r.y < -1 || r.x < -1 || r.width < 100,
      },
      {
        navn: 'Tittel (x, y, bredde)',
        verdi: tittel
          ? `${Math.round(tittel.x)}, ${Math.round(tittel.y)}, ${Math.round(tittel.width)}`
          : 'finnes ikke',
        mistenkelig: tittel ? tittel.width < 10 : true,
      },
      {
        navn: 'Knapper til høyre (x, y, bredde)',
        verdi: høyre
          ? `${Math.round(høyre.x)}, ${Math.round(høyre.y)}, ${Math.round(høyre.width)}`
          : 'finnes ikke',
        mistenkelig: høyre ? høyre.width < 10 || høyre.x > window.innerWidth : true,
      },
      { navn: 'position / z-index', verdi: `${stil.position} / ${stil.zIndex}` },
      { navn: 'opacity / visibility', verdi: `${stil.opacity} / ${stil.visibility}` },
      { navn: 'transform', verdi: stil.transform },
    )
  }

  return rader
}

export function Diagnostics() {
  const navbarRef = useRef<HTMLDivElement>(null)
  const [rader, setRader] = useState<Rad[]>([])

  const mål = useCallback(() => {
    // Topplinja er første <header> inne i innpakningen.
    setRader(måling(navbarRef.current?.querySelector('header') ?? null))
  }, [])

  useEffect(() => {
    mål()
    const vv = window.visualViewport
    window.addEventListener('resize', mål)
    window.addEventListener('scroll', mål, { passive: true })
    vv?.addEventListener('resize', mål)
    vv?.addEventListener('scroll', mål)
    return () => {
      window.removeEventListener('resize', mål)
      window.removeEventListener('scroll', mål)
      vv?.removeEventListener('resize', mål)
      vv?.removeEventListener('scroll', mål)
    }
  }, [mål])

  return (
    <>
      {/* Nøyaktig samme markup som Prosjekter-skjermen, så feilen oppfører seg likt. */}
      <div ref={navbarRef}>
        <Navbar
          title="Prosjekter"
          large
          trailing={
            <>
              <button type="button" className="iconbutton">
                <Plus size={24} />
              </button>
              <Menu label={<Person size={24} />}>
                <MenuItem onClick={() => undefined}>Testvalg</MenuItem>
              </Menu>
            </>
          }
        />
      </div>

      <main className="content">
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          Ser topplinja over denne teksten tom ut? Ta et skjermbilde av hele siden nå.
          Står det <strong>NEI</strong> på «Kan siden scrolles?» samtidig som tallene for
          tittel og knapper ser riktige ut, er elementene der – de males bare ikke.
        </p>

        <div className="card">
          {rader.map((rad) => (
            <div className="row" key={rad.navn}>
              <span className="row__grow">
                <span className="row__subtitle" style={{ marginTop: 0 }}>
                  {rad.navn}
                </span>
                <span
                  className="row__title"
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: rad.mistenkelig ? 'var(--destructive)' : undefined,
                  }}
                >
                  {rad.verdi}
                </span>
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="button button--prominent"
          style={{ marginTop: 16 }}
          onClick={mål}
        >
          Mål på nytt
        </button>
      </main>
    </>
  )
}
