/**
 * En kort, feststemt fanfare som genereres i koden (ingen lydfil trengs).
 *
 * Port av Fanfare.swift: samme C-dur-oppgang som ender i en oktav, men bygget
 * med Web Audio-oscillatorer i stedet for en generert WAV-fil.
 */

// (frekvens, starttid i sekunder, lengde i sekunder)
const NOTES: { freq: number; start: number; length: number }[] = [
  { freq: 523.25, start: 0.0, length: 1.0 }, // C5
  { freq: 659.25, start: 0.12, length: 0.9 }, // E5
  { freq: 783.99, start: 0.24, length: 0.9 }, // G5
  { freq: 1046.5, start: 0.4, length: 1.0 }, // C6
]

let context: AudioContext | null = null

/**
 * Spiller fanfaren. Må kalles fra en brukerhandling første gang, ellers
 * blokkerer nettleseren lyden – det passer, siden den utløses av et trykk.
 */
export function playFanfare() {
  try {
    context ??= new AudioContext()
    // iOS suspenderer konteksten mellom økter.
    if (context.state === 'suspended') void context.resume()

    const ctx = context
    const startTime = ctx.currentTime + 0.02

    for (const note of NOTES) {
      // Grunntone + litt 2. harmonisk gir en lysere, festligere klang.
      addTone(ctx, note.freq, startTime + note.start, note.length, 0.28 * 0.7)
      addTone(ctx, note.freq * 2, startTime + note.start, note.length, 0.28 * 0.2)
    }
  } catch {
    // Lyden er "nice to have" – vi ignorerer feil i stillhet.
  }
}

function addTone(
  ctx: AudioContext,
  freq: number,
  at: number,
  length: number,
  peak: number,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.value = freq

  // Mild decay-envelope for en klokkeaktig tone, som exp(-3t) i Swift-versjonen.
  gain.gain.setValueAtTime(peak, at)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak * Math.exp(-3 * length), 0.0001), at + length)

  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + length)
}
