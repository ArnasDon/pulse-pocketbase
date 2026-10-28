import { QRCodeSVG } from "qrcode.react"
import { LiveDot } from "@/components/LiveDot"
import { Logo } from "@/components/Logo"
import { PulseLine, beatsPerMinute } from "@/components/PulseLine"
import { toBeat, type Reaction } from "@/lib/pb"
import { roomLink } from "@/lib/router"
import { useBeatBuffer } from "@/lib/useReactionBeats"
import { useRoomLive } from "@/lib/useRoomLive"

export function ScreenPage({ code }: { code: string }) {
  const { beats, push } = useBeatBuffer()
  const { status, room, questions, voteCount, connected } = useRoomLive(code, (reaction: Reaction) => push(toBeat(reaction)))

  if (status !== "ready" || !room) {
    return (
      <main className="grid min-h-svh place-items-center text-2xl text-muted-foreground">
        {status === "missing" ? `No room called ${code}` : "Loading…"}
      </main>
    )
  }

  const open = questions.filter((question) => !question.answered)
  const spotlight = questions.find((question) => question.id === room.spotlight)
  const headline = spotlight ?? open[0]
  const next = open.filter((question) => question.id !== headline?.id).slice(0, 3)
  const perMinute = beatsPerMinute(beats)

  return (
    <main className="grid h-svh grid-rows-[auto_1fr_auto] overflow-hidden">
      <header className="flex items-center gap-6 px-10 pt-8">
        <Logo className="text-3xl" />
        <h1 className="min-w-0 flex-1 truncate text-xl text-muted-foreground">{room.title}</h1>
        <LiveDot connected={connected} className="text-sm" />
      </header>

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto] gap-12 px-10 pt-8">
        <section className="grid min-h-0 content-start gap-8">
          {headline ? (
            <div className="grid gap-4">
              <p className="text-sm font-semibold tracking-[0.2em] text-beat uppercase">
                {spotlight ? "On stage now" : "Most asked"}
              </p>
              <p key={headline.id} className="beat-in line-clamp-4 text-[clamp(2rem,4.2vw,4.5rem)] leading-[1.05] font-semibold text-balance">
                {headline.text}
              </p>
              <p className="text-lg text-muted-foreground">
                {headline.author || "Anonymous"} ·{" "}
                <span className="font-heading text-2xl font-bold text-foreground tabular-nums">{voteCount.get(headline.id) ?? 0}</span> votes
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              <p className="text-sm font-semibold tracking-[0.2em] text-beat uppercase">Waiting for the first question</p>
              <p className="font-heading text-[clamp(3rem,7vw,7rem)] leading-[0.9] font-extrabold uppercase">Scan the code and ask anything</p>
            </div>
          )}

          {next.length > 0 && (
            <ol className="grid gap-3 border-t pt-5" aria-label="Up next">
              {next.map((question) => (
                <li key={question.id} className="flex items-baseline gap-5">
                  <span className="font-heading w-12 shrink-0 text-right text-3xl font-bold tabular-nums">
                    {voteCount.get(question.id) ?? 0}
                  </span>
                  <span className="line-clamp-1 text-xl text-muted-foreground">{question.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className="grid content-start justify-items-center gap-4 self-start rounded-3xl border bg-card p-6">
          <QRCodeSVG value={roomLink(room.code)} size={210} marginSize={0} fgColor="#14151c" bgColor="#ffffff" title={`Join room ${room.code}`} />
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{window.location.host}</p>
            <p className="code-display text-6xl leading-none font-extrabold" translate="no">{room.code}</p>
          </div>
          {!room.open && <p className="text-sm font-medium text-beat">Closed for new questions</p>}
        </aside>
      </div>

      <footer className="relative px-10 pb-6">
        <p className="absolute top-0 right-10 text-sm text-muted-foreground">
          <span className="font-heading text-3xl font-bold text-foreground tabular-nums">{perMinute}</span> reactions/min
        </p>
        <PulseLine beats={beats} height={170} emojiSize="2.5rem" />
      </footer>
    </main>
  )
}
