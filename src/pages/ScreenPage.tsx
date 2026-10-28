import { useCallback, useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { ArrowLeft, ChevronUp } from "lucide-react"
import { LiveDot } from "@/components/LiveDot"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EMOJI, type Reaction } from "@/lib/pb"
import { go, roomLink } from "@/lib/router"
import { useRoomLive } from "@/lib/useRoomLive"
import { cn } from "@/lib/utils"

interface Floater {
  id: string
  emoji: string
  left: number
  drift: number
}

export function ScreenPage({ code }: { code: string }) {
  const [floaters, setFloaters] = useState<Floater[]>([])
  const [reactionCount, setReactionCount] = useState(0)

  const onReaction = useCallback((reaction: Reaction) => {
    const floater = {
      id: reaction.id,
      emoji: EMOJI[reaction.emoji],
      left: 8 + Math.random() * 84,
      drift: Math.round((Math.random() - 0.5) * 120),
    }
    setReactionCount((count) => count + 1)
    setFloaters((current) => [...current.slice(-40), floater])
    window.setTimeout(() => setFloaters((current) => current.filter((f) => f.id !== floater.id)), 4200)
  }, [])

  const { status, room, questions, votes, voteCount, connected } = useRoomLive(code, onReaction)

  useEffect(() => {
    document.documentElement.classList.add("dark")
    return () => document.documentElement.classList.remove("dark")
  }, [])

  if (status !== "ready" || !room) {
    return (
      <main className="bg-background text-muted-foreground grid min-h-svh place-items-center">
        {status === "missing" ? `No room called ${code}` : "Loading…"}
      </main>
    )
  }

  const link = roomLink(room.code)
  const open = questions.filter((question) => !question.answered)
  const top = open.slice(0, 6)

  return (
    <main className="bg-background text-foreground relative grid min-h-svh overflow-hidden lg:grid-cols-[minmax(320px,2fr)_3fr]">
      <aside className="flex flex-col gap-8 border-b p-8 lg:border-r lg:border-b-0 lg:p-12">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => go(`/r/${room.code}`)}>
            <ArrowLeft />
          </Button>
          <span className="text-2xl font-semibold tracking-tight">
            Pulse<span className="text-emerald-500">.</span>
          </span>
          <LiveDot connected={connected} className="text-muted-foreground ml-auto text-sm" />
        </div>
        <div className="grid gap-2">
          <h1 className="text-4xl font-semibold tracking-tight text-balance lg:text-5xl">{room.title}</h1>
          {!room.open && <Badge variant="secondary">Closed for new questions</Badge>}
        </div>
        <div className="grid justify-items-start gap-4">
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG value={link} size={220} marginSize={0} />
          </div>
          <div className="grid gap-1">
            <p className="text-muted-foreground text-sm">Scan, or go to {window.location.host} and enter</p>
            <p className="font-mono text-6xl font-semibold tracking-[0.2em] text-emerald-400">{room.code}</p>
          </div>
        </div>
        <dl className="mt-auto grid grid-cols-3 gap-4">
          {[
            ["Questions", questions.length],
            ["Votes", votes.length],
            ["Reactions", reactionCount],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-0.5">
              <dt className="text-muted-foreground text-xs tracking-wide uppercase">{label}</dt>
              <dd className="font-mono text-3xl tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <section className="grid content-start gap-4 p-8 lg:p-12">
        <h2 className="text-muted-foreground text-sm tracking-wide uppercase">Top questions</h2>
        {top.length === 0 && (
          <p className="text-muted-foreground rounded-2xl border border-dashed p-12 text-center text-xl">
            Waiting for the first question…
          </p>
        )}
        <ol className="grid gap-3">
          {top.map((question, index) => (
            <li
              key={question.id}
              className={cn(
                "animate-in fade-in slide-in-from-bottom-3 flex items-start gap-5 rounded-2xl border p-5 transition-all duration-500",
                index === 0 ? "border-emerald-500/50 bg-emerald-500/10" : "bg-card",
              )}
            >
              <div className="grid w-16 shrink-0 justify-items-center">
                <ChevronUp className="text-muted-foreground size-5" />
                <span className="font-mono text-3xl font-semibold tabular-nums">{voteCount.get(question.id) ?? 0}</span>
              </div>
              <div className="grid gap-1">
                <p className={cn("leading-snug text-balance", index === 0 ? "text-3xl" : "text-xl")}>{question.text}</p>
                <p className="text-muted-foreground text-sm">{question.author || "Anonymous"}</p>
              </div>
            </li>
          ))}
        </ol>
        {open.length > top.length && (
          <p className="text-muted-foreground text-sm">+{open.length - top.length} more in the room</p>
        )}
      </section>

      <div aria-hidden className="pointer-events-none absolute inset-0">
        {floaters.map((floater) => (
          <span
            key={floater.id}
            className="pulse-float absolute bottom-0 text-6xl"
            style={{ left: `${floater.left}%`, ["--drift" as string]: `${floater.drift}px` }}
          >
            {floater.emoji}
          </span>
        ))}
      </div>
    </main>
  )
}
