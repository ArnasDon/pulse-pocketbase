import { useEffect } from "react"
import { CodeInput } from "@/components/CodeInput"
import { Logo } from "@/components/Logo"
import { PulseLine, beatsPerMinute } from "@/components/PulseLine"
import { buttonVariants } from "@/components/ui/button"
import { pb, toBeat, useAuth, type Reaction } from "@/lib/pb"
import { useBeatBuffer } from "@/lib/useReactionBeats"

const STEPS = [
  ["Open a room", "Give it a name. Pulse puts a QR code and a 5-character code on your screen."],
  ["The room joins", "People scan with their phones. No app, no account, no sign-up."],
  ["Questions rise", "Every question, vote and reaction lands on every screen within a blink."],
]

function useGlobalBeats() {
  const { beats, push } = useBeatBuffer()
  useEffect(() => {
    let unsubscribe: (() => Promise<void>) | undefined
    let cancelled = false
    pb.collection("reactions")
      .getList<Reaction>(1, 40, {
        filter: pb.filter("created >= {:since}", { since: new Date(Date.now() - 20000) }),
        sort: "-created",
      })
      .then((page) => !cancelled && page.items.reverse().forEach((reaction) => push(toBeat(reaction))))
      .catch(() => null)
    pb.collection("reactions")
      .subscribe<Reaction>("*", (event) => event.action === "create" && push(toBeat(event.record)))
      .then((fn) => {
        if (cancelled) fn()
        else unsubscribe = fn
      })
      .catch(() => null)
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [push])
  return beats
}

export function Home() {
  const user = useAuth()
  const beats = useGlobalBeats()
  const perMinute = beatsPerMinute(beats)

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <a href="#/host" className={buttonVariants({ variant: "ghost" })}>
          {user ? "Your rooms" : "Host a room"}
        </a>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-6 pb-10 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:pt-14">
          <div className="grid gap-6">
            <h1 className="font-heading text-[clamp(3.5rem,11vw,8.5rem)] leading-[0.82] font-extrabold tracking-tight uppercase">
              What’s the room <span className="text-beat">asking?</span>
            </h1>
            <p className="max-w-md text-lg text-pretty text-muted-foreground">
              Live questions, votes and reactions for all-hands, classes and talks. The best questions rise to the top while you speak.
            </p>
          </div>
          <div className="grid gap-3 rounded-2xl border bg-card p-5 shadow-[0_1px_0_var(--line)] sm:p-6">
            <h2 className="text-lg font-semibold">Join a room</h2>
            <CodeInput />
            <p className="text-sm text-muted-foreground">
              Running the meeting?{" "}
              <a href="#/host" className="font-medium text-foreground underline underline-offset-4 hover:text-beat">
                Start a room
              </a>{" "}
              in under a minute.
            </p>
          </div>
        </section>

        <section aria-labelledby="pulse-heading" className="border-y bg-card">
          <div className="mx-auto grid max-w-6xl gap-2 px-4 pt-5 sm:px-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="pulse-heading" className="text-sm font-semibold">
                The heartbeat of every room, live
              </h2>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {perMinute === 0 ? (
                  "Quiet right now. Send a reaction in any room and watch it jump."
                ) : (
                  <>
                    <span className="font-heading text-xl font-bold text-foreground tabular-nums">{perMinute}</span>{" "}
                    {perMinute === 1 ? "reaction" : "reactions"} in the last minute
                  </>
                )}
              </p>
            </div>
          </div>
          <PulseLine beats={beats} height={150} className="mx-auto max-w-6xl" />
          <p className="sr-only">A line that spikes each time anyone sends a reaction in any room.</p>
        </section>

        <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
          <h2 id="how-heading" className="sr-only">
            How it works
          </h2>
          <ol className="grid gap-8 sm:grid-cols-3">
            {STEPS.map(([title, body], index) => (
              <li key={title} className="grid content-start gap-2 border-t-2 border-ink pt-4">
                <span className="font-heading text-5xl leading-none font-extrabold text-beat tabular-nums">{index + 1}</span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-sm text-muted-foreground sm:px-8">
        Runs on a PocketBase backend on Hostinger web hosting.
      </footer>
    </div>
  )
}
