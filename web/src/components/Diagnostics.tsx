/**
 * Midlertidig diagnoseskjerm. Nås fra konto-menyen på Prosjekter.
 *
 * Finnes fordi en feil bare viser seg på iPhone: topplinja blir usynlig, og
 * kommer tilbake hvis du zoomer ut. To ting avgrenser den:
 *   - den skjer bare når siden er kort nok til at den ikke kan scrolles
 *   - den skjer bare i standalone («lagt til på Hjem-skjerm»), ikke i Safari
 * Begge peker samme vei: uten adresselinje er det mer plass, så siden slutter
 * å scrolle. Det er trolig én betingelse, ikke to.
 *
 * Avlesningen skiller mellom tre helt ulike årsaker:
 *   1. Siden er skalert            → zoom er ikke 1.000
 *   2. Innholdet er skjøvet        → dokument bredere enn vindu, eller offset
 *   3. Alt ligger riktig, males ei → alle tall stemmer, men linja er usynlig
 *
 * Nummer 3 er mistanken. Den kan bare påvises ved at topplinjas koordinater er
 * riktige samtidig som den ikke synes.
 *
 * VIKTIG: hele skjermen må få plass uten scroll. Kan siden scrolles, forsvinner
 * betingelsen feilen oppstår under, og vi måler ingenting.
 *
 * Slett denne fila, ruten i App.tsx og menyvalget i ProjectList når feilen er
 * ute av verden.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Person, Plus } from '../icons'
import { Dialog, Menu, MenuItem, Navbar } from './chrome'

type Rad = { navn: string; verdi: string; mistenkelig?: boolean }

function måling(navbar: HTMLElement | null): Rad[] {
  const doc = document.documentElement
  const vv = window.visualViewport
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  // env() kan ikke leses direkte, så vi lar CSS regne den ut for oss.
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;top:-9999px;height:env(safe-area-inset-top)'
  document.body.appendChild(probe)
  const safeTop = probe.getBoundingClientRect().height
  probe.remove()

  const rader: Rad[] = [
    { navn: 'modus', verdi: standalone ? 'STANDALONE (hjem-app)' : 'nettleser' },
    { navn: 'safe-area topp', verdi: `${safeTop.toFixed(1)}px` },
    {
      navn: 'zoom',
      verdi: vv ? vv.scale.toFixed(3) : '–',
      mistenkelig: vv ? Math.abs(vv.scale - 1) > 0.001 : false,
    },
    {
      navn: 'vindu',
      verdi: `${window.innerWidth}x${window.innerHeight}`,
    },
    {
      navn: 'synlig felt',
      verdi: vv ? `${Math.round(vv.width)}x${Math.round(vv.height)} @${Math.round(vv.offsetLeft)},${Math.round(vv.offsetTop)}` : '–',
      mistenkelig: vv ? vv.offsetLeft !== 0 || vv.offsetTop !== 0 : false,
    },
    {
      navn: 'dokument b/h',
      verdi: `${doc.scrollWidth}/${doc.scrollHeight} vs ${doc.clientWidth}/${doc.clientHeight}`,
      mistenkelig: doc.scrollWidth > doc.clientWidth,
    },
    {
      navn: 'kan scrolle',
      verdi: doc.scrollHeight > doc.clientHeight ? 'JA' : 'NEI  <-- feilbetingelse',
    },
  ]

  if (navbar) {
    const r = navbar.getBoundingClientRect()
    const t = navbar.querySelector('.navbar__title')?.getBoundingClientRect()
    const h = navbar.querySelector('.navbar__trailing')?.getBoundingClientRect()
    const s = window.getComputedStyle(navbar)

    rader.push(
      {
        navn: 'topplinje x,y,b,h',
        verdi: `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`,
        mistenkelig: r.y < -1 || r.x < -1 || r.width < 100 || r.height < 10,
      },
      {
        navn: 'tittel x,y,b',
        verdi: t ? `${Math.round(t.x)},${Math.round(t.y)},${Math.round(t.width)}` : 'mangler',
        mistenkelig: !t || t.width < 10,
      },
      {
        navn: 'knapper x,y,b',
        verdi: h ? `${Math.round(h.x)},${Math.round(h.y)},${Math.round(h.width)}` : 'mangler',
        mistenkelig: !h || h.width < 10 || h.x > window.innerWidth,
      },
      {
        navn: 'synlighet',
        verdi: `${s.position} z${s.zIndex} op${s.opacity} ${s.visibility}`,
        mistenkelig: s.opacity !== '1' || s.visibility !== 'visible',
      },
    )
  }

  return rader
}

export function Diagnostics() {
  const ref = useRef<HTMLDivElement>(null)
  const [rader, setRader] = useState<Rad[]>([])
  const [dialogÅpen, setDialogÅpen] = useState(false)
  const [egetLag, setEgetLag] = useState(false)

  const header = () => ref.current?.querySelector('header') as HTMLElement | null

  const mål = useCallback(() => {
    setRader(måling(ref.current?.querySelector('header') ?? null))
  }, [])

  /**
   * Kandidatfiks B: tving fram en ny opptegning uten å røre layouten.
   * Å skru display av og på igjen får WebKit til å tegne elementet på nytt.
   */
  const tvingOpptegning = () => {
    const el = header()
    if (!el) return
    el.style.display = 'none'
    void el.offsetHeight // leser fram en reflow
    el.style.display = ''
    mål()
  }

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
      {/* Samme markup som Prosjekter, så feilen oppfører seg likt her. */}
      <div ref={ref}>
        <Navbar
          title="Prosjekter"
          large
          trailing={
            <>
              <button type="button" className="iconbutton">
                <Plus size={24} />
              </button>
              <Menu label={<Person size={24} />}>
                <MenuItem onClick={() => undefined}>Test</MenuItem>
              </Menu>
            </>
          }
        />
      </div>

      <main className="content">
        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-secondary)' }}>
          Er topplinja over tom? Ta skjermbilde nå.
        </p>

        <div
          style={{
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: 12,
            lineHeight: 1.5,
            background: 'var(--card)',
            borderRadius: 12,
            padding: '10px 12px',
          }}
        >
          {rader.map((rad) => (
            <div key={rad.navn} style={{ color: rad.mistenkelig ? 'var(--destructive)' : undefined }}>
              {rad.navn}: {rad.verdi}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="button button--plain"
          style={{ marginTop: 8 }}
          onClick={mål}
        >
          Mål på nytt
        </button>
      </main>
    </>
  )
}
