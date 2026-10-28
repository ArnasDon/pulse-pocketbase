import { useCallback, useEffect, useState } from "react"
import type { Beat } from "@/components/PulseLine"

const BEAT_GAP_MS = 420

export function useBeatBuffer(windowMs = 60000) {
  const [beats, setBeats] = useState<Beat[]>([])
  const push = useCallback(
    (beat: Beat) =>
      setBeats((current) => {
        if (current.some((b) => b.id === beat.id)) return current
        const last = current.at(-1)
        const at = last ? Math.max(beat.at, last.at + BEAT_GAP_MS) : beat.at
        return [...current.filter((b) => Date.now() - b.at < windowMs), { ...beat, at }]
      }),
    [windowMs],
  )
  useEffect(() => {
    const timer = window.setInterval(
      () => setBeats((current) => current.filter((b) => Date.now() - b.at < windowMs)),
      5000,
    )
    return () => window.clearInterval(timer)
  }, [windowMs])
  return { beats, push, setBeats }
}
