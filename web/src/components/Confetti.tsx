/**
 * En raus konfetti-effekt bygget kun med CSS (ingen eksterne pakker).
 *
 * Port av ConfettiView.swift: samme 340 biter, samme miks av fargede figurer
 * og 🐶/🧶-emojier som daler nedover skjermen når visningen dukker opp.
 */

import { useMemo } from 'react'

const COLORS = [
  '#ff3b30', // red
  '#ff9500', // orange
  '#ffcc00', // yellow
  '#34c759', // green
  '#00c7be', // mint
  '#30b0c7', // teal
  '#007aff', // blue
  '#5856d6', // indigo
  '#af52de', // purple
  '#ff2d55', // pink
  '#3da8b0', // Theme.accent
  '#c7804a', // Theme.secondary
  '#85a16b', // Theme.tertiary
]

const EMOJIS = ['🐶', '🧶']

const random = (min: number, max: number) => min + Math.random() * (max - min)

type Piece = {
  id: number
  left: number
  color: string
  width: number
  height: number
  delay: number
  spin: number
  isCircle: boolean
  duration: number
  emoji: string | null
  emojiSize: number
}

/** Beskrivelsen av bitene genereres én gang, så de ikke endrer seg ved omtegning. */
function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: random(0, 100),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    width: random(7, 14),
    height: random(10, 20),
    delay: random(0, 1),
    spin: random(180, 1080) * (Math.random() < 0.5 ? 1 : -1),
    isCircle: Math.random() < 0.5,
    duration: random(2.4, 3.6),
    // Omtrent hver femte bit er en emoji, resten er fargede figurer.
    emoji: Math.floor(random(0, 5)) === 0 ? EMOJIS[Math.floor(Math.random() * 2)] : null,
    emojiSize: random(26, 46),
  }))
}

export function Confetti({ count = 340 }: { count?: number }) {
  const pieces = useMemo(() => makePieces(count), [count])

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti__piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ['--spin' as string]: `${piece.spin}deg`,
            ...(piece.emoji
              ? { fontSize: `${piece.emojiSize}px`, lineHeight: 1 }
              : {
                  width: `${piece.width}px`,
                  height: `${piece.height}px`,
                  background: piece.color,
                  borderRadius: piece.isCircle ? '50%' : '2px',
                }),
          }}
        >
          {piece.emoji}
        </div>
      ))}
    </div>
  )
}
