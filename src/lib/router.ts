import { useEffect, useState } from "react"

export type Route =
  | { page: "home" }
  | { page: "host" }
  | { page: "console"; code: string }
  | { page: "room"; code: string }
  | { page: "screen"; code: string }

function parse(hash: string): Route {
  const [, kind, code] = hash.replace(/^#/, "").split("/")
  const roomCode = code?.toUpperCase()
  if (kind === "host") return roomCode ? { page: "console", code: roomCode } : { page: "host" }
  if (kind === "r" && roomCode) return { page: "room", code: roomCode }
  if (kind === "screen" && roomCode) return { page: "screen", code: roomCode }
  return { page: "home" }
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener("hashchange", onChange)
    return () => window.removeEventListener("hashchange", onChange)
  }, [])
  return route
}

export function go(path: string) {
  window.location.hash = path
}

export function roomLink(code: string) {
  return `${window.location.origin}/#/r/${code}`
}
