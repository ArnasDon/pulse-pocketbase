import { useCallback, useEffect, useState } from "react"
import type { Beat } from "@/components/PulseLine"

export function useBeatBuffer(windowMs = 60000) {
  const [beats, setBeats] = useState<Beat[]>([])
  const push = useCallback(
    (beat: Beat) =>
      setBeats((current) =>
        current.some((b) => b.id === beat.id) ? current : [...current.filter((b) => Date.now() - b.at < windowMs), beat],
      ),
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
