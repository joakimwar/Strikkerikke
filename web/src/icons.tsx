/**
 * Ikoner som erstatter SF Symbols. Enkle strek-ikoner i samme 24×24-rutenett,
 * så de får samme vekt som resten av grensesnittet.
 */

import type { ReactNode } from 'react'

type IconProps = {
  size?: number
  className?: string
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Svg({ size = 22, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M12 5v14M5 12h14" />
  </Svg>
)

export const Minus = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M5 12h14" />
  </Svg>
)

export const Play = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4.8l12 7.2-12 7.2z" fill="currentColor" />
  </Svg>
)

export const Pause = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6.5" y="5" width="4" height="14" rx="1.3" fill="currentColor" />
    <rect x="13.5" y="5" width="4" height="14" rx="1.3" fill="currentColor" />
  </Svg>
)

export const Timer = (p: IconProps) => (
  <Svg {...p}>
    <circle {...stroke} cx="12" cy="13.5" r="8" />
    <path {...stroke} d="M12 13.5V9M9 2.5h6" />
  </Svg>
)

export const Clock = (p: IconProps) => (
  <Svg {...p}>
    <circle {...stroke} cx="12" cy="12" r="9" />
    <path {...stroke} d="M12 7v5.3l3.8 2.2" />
  </Svg>
)

export const ChartBar = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M5 20V13M12 20V6M19 20v-9" />
  </Svg>
)

export const Rotate = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3 8.5" />
    <path {...stroke} d="M3 4v4.7h4.7" />
  </Svg>
)

export const Ellipsis = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.8" fill="currentColor" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    <circle cx="19" cy="12" r="1.8" fill="currentColor" />
  </Svg>
)

export const CheckCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path
      d="M7.5 12.4l3 3 6-6.2"
      fill="none"
      stroke="var(--card)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const Photo = (p: IconProps) => (
  <Svg {...p}>
    <rect {...stroke} x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle {...stroke} cx="8.5" cy="10" r="1.6" />
    <path {...stroke} d="M4 17l4.8-4.6 4 3.6 2.9-2.6L20 17.5" />
  </Svg>
)

export const Trash = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 12.5h9L17.5 7" />
  </Svg>
)

export const Scissors = (p: IconProps) => (
  <Svg {...p}>
    <circle {...stroke} cx="6.5" cy="17.5" r="3" />
    <circle {...stroke} cx="17.5" cy="17.5" r="3" />
    <path {...stroke} d="M8.6 15.4L19 4M15.4 15.4L5 4" />
  </Svg>
)

export const Stack = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M12 2.8l9 4.7-9 4.7-9-4.7z" />
    <path {...stroke} d="M3 12.5l9 4.7 9-4.7" />
  </Svg>
)

export const Hash = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M9.5 3.5L7.5 20.5M16.5 3.5l-2 17M4 9h16M3 15h16" />
  </Svg>
)

export const ListNumber = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M10 6.5h10M10 12h10M10 17.5h10" />
    <path {...stroke} d="M4 4.8h1.4v4M3.6 15.2h2.6l-2.6 4h2.8" />
  </Svg>
)

export const ChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M15 5l-7 7 7 7" />
  </Svg>
)

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M9 5l7 7-7 7" />
  </Svg>
)

export const ArrowUp = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
)

export const ArrowDown = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
)

export const Undo = (p: IconProps) => (
  <Svg {...p}>
    <path {...stroke} d="M3 9h11.5a5.5 5.5 0 0 1 0 11H8" />
    <path {...stroke} d="M6.5 4.5L2.5 9l4 4.5" />
  </Svg>
)
