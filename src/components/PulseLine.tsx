import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export interface Beat {
  id: string
  emoji: string
  at: number
}

interface PulseLineProps {
  beats: Beat[]
  height?: number
  windowMs?: number
  className?: string
  emojiSize?: string
}

const WIDTH = 1000
const STEP = 4

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReduced(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return reduced
}

function useNow(reduced: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (reduced) {
      const timer = window.setInterval(() => setNow(Date.now()), 1000)
      return () => window.clearInterval(timer)
    }
    let frame = 0
    const tick = () => {
      setNow(Date.now())
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduced])
  return now
}

function beatX(beat: Beat, now: number, windowMs: number) {
  return WIDTH * 0.97 - ((now - beat.at) / windowMs) * WIDTH
}

function heartbeat(distance: number, amplitude: number) {
  const g = (offset: number, spread: number) => Math.exp(-(((distance - offset) / spread) ** 2))
  return amplitude * (0.12 * g(-30, 8) - 0.22 * g(-9, 4) + g(0, 3.6) - 0.34 * g(8, 4) + 0.18 * g(30, 10))
}

export function PulseLine({ beats, height = 120, windowMs = 20000, className, emojiSize = "1.75rem" }: PulseLineProps) {
  const reduced = useReducedMotion()
  const now = useNow(reduced)
  const baseline = height * 0.72
  const amplitude = height * 0.55
  const visible = beats.filter((beat) => {
    const x = beatX(beat, now, windowMs)
    return x > -40 && x < WIDTH + 40
  })
  const positions = visible.map((beat) => beatX(beat, now, windowMs))

  let path = ""
  for (let x = 0; x <= WIDTH; x += STEP) {
    let lift = 0
    for (const bx of positions) {
      const distance = x - bx
      if (Math.abs(distance) < 60) {
        const value = heartbeat(distance, amplitude)
        if (Math.abs(value) > Math.abs(lift)) lift = value
      }
    }
    const wobble = reduced ? 0 : Math.sin(x / 23 + now / 900) * 0.8
    const y = Math.min(height - 2, Math.max(2, baseline + wobble - lift))
    path += `${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`
  }

  return (
    <div className={cn("relative w-full select-none", className)} style={{ height }} aria-hidden>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <line x1="0" x2={WIDTH} y1={baseline} y2={baseline} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={path} fill="none" stroke="var(--beat)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {visible.map((beat, index) => (
        <span
          key={beat.id}
          className="beat-in absolute leading-none"
          style={{
            left: `${(positions[index] / WIDTH) * 100}%`,
            top: baseline - amplitude - 8,
            fontSize: emojiSize,
            translate: "-50% -100%",
          }}
        >
          {beat.emoji}
        </span>
      ))}
    </div>
  )
}

export function beatsPerMinute(beats: Beat[], now = Date.now()) {
  return beats.filter((beat) => now - beat.at < 60000).length
}
