import { useMemo } from 'react'

const COLORS = ['#ff4d79', '#ff7a59', '#ffc46b', '#4fd6a5', '#b57bff', '#6fb5ff']

/** Cheap celebratory confetti — pure CSS animation, no library. */
export function Confetti({ count = 40 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length],
        skew: Math.random() * 40 - 20,
      })),
    [count],
  )
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `skewY(${p.skew}deg)`,
          }}
        />
      ))}
    </div>
  )
}
