/**
 * Gjenbrukbar tidsvisning for strikketid.
 * Port av ElapsedTimeView – rent lesevisning, start/pause styres av skjermene.
 */

import { elapsed, formatDuration, isRunning, type Stopwatch } from '../model'
import { useNow } from '../hooks'

export function ElapsedTime({ stopwatch, className }: { stopwatch: Stopwatch; className?: string }) {
  // Oppdaterer bare mens klokka faktisk går.
  const now = useNow(isRunning(stopwatch))
  return <span className={className ?? 'time'}>{formatDuration(elapsed(stopwatch, now))}</span>
}
