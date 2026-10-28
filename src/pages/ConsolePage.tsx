import { useEffect, useRef, useState } from "react"
import { Check, Copy, Lock, LockOpen, Megaphone, MonitorPlay, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { LiveDot } from "@/components/LiveDot"
import { Logo } from "@/components/Logo"
import { PulseLine } from "@/components/PulseLine"
import { QuestionItem } from "@/components/QuestionItem"
import { Button, buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { errorMessage, pb, toBeat, useAuth, type Question, type Reaction } from "@/lib/pb"
import { roomLink } from "@/lib/router"
import { useBeatBuffer } from "@/lib/useReactionBeats"
import { useRoomLive } from "@/lib/useRoomLive"

const UNDO_MS = 5000

export function ConsolePage({ code }: { code: string }) {
  const user = useAuth()
  const { beats, push } = useBeatBuffer()
  const { status, room, questions, voteCount, connected } = useRoomLive(code, (reaction: Reaction) => push(toBeat(reaction)))
  const [removing, setRemoving] = useState<Set<string>>(new Set())
  const timers = useRef(new Map<string, number>())

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  if (status === "missing") {
    return <main className="grid min-h-svh place-items-center text-muted-foreground">No room called {code}.</main>
  }
  if (status === "loading" || !room) {
    return <main className="grid min-h-svh place-items-center text-muted-foreground">Loading {code}…</main>
  }
  if (user?.id !== room.owner) {
    return (
      <main className="mx-auto grid min-h-svh max-w-md content-center gap-4 px-4 text-center">
        <h1 className="font-heading text-4xl font-bold uppercase">Only the host can moderate {room.code}</h1>
        <p className="text-muted-foreground">Sign in with the account that started this room, or join it as a guest.</p>
        <div className="flex justify-center gap-2">
          <a href="#/host" className={buttonVariants()}>Sign in to host</a>
          <a href={`#/r/${room.code}`} className={buttonVariants({ variant: "outline" })}>Join as a guest</a>
        </div>
      </main>
    )
  }

  const visible = questions.filter((question) => !removing.has(question.id))
  const queue = visible.filter((question) => !question.answered && question.id !== room.spotlight)
  const answered = visible.filter((question) => question.answered)
  const spotlight = visible.find((question) => question.id === room.spotlight)
  const link = roomLink(room.code)

  const fail = (error: unknown) => toast.error(errorMessage(error))
  const updateRoom = (patch: Record<string, unknown>) => pb.collection("rooms").update(room.id, patch).catch(fail)

  const putOnStage = (question: Question) => updateRoom({ spotlight: question.id })
  const finishStage = async (question: Question) => {
    await pb.collection("questions").update(question.id, { answered: true }).catch(fail)
    await updateRoom({ spotlight: "" })
    toast.success("Marked answered. The stage is clear for the next question.")
  }
  const reopen = (question: Question) => pb.collection("questions").update(question.id, { answered: false }).catch(fail)

  const remove = (question: Question) => {
    setRemoving((current) => new Set(current).add(question.id))
    if (room.spotlight === question.id) updateRoom({ spotlight: "" })
    const timer = window.setTimeout(() => {
      timers.current.delete(question.id)
      pb.collection("questions")
        .delete(question.id)
        .catch((error) => {
          fail(error)
          setRemoving((current) => {
            const next = new Set(current)
            next.delete(question.id)
            return next
          })
        })
    }, UNDO_MS)
    timers.current.set(question.id, timer)
    toast("Question removed from every screen.", {
      duration: UNDO_MS,
      action: {
        label: "Undo",
        onClick: () => {
          window.clearTimeout(timers.current.get(question.id))
          timers.current.delete(question.id)
          setRemoving((current) => {
            const next = new Set(current)
            next.delete(question.id)
            return next
          })
        },
      },
    })
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast.success("Join link copied.")
    } catch {
      toast.error(`Copy failed. The join link is ${link}`)
    }
  }

  return (
    <div className="min-h-svh">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-8">
          <Logo href="#/host" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">{room.title}</h1>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="code-display" translate="no">{room.code}</span>
              <LiveDot connected={connected} />
              {!room.open && <span>Closed</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyLink}>
              <Copy data-icon="inline-start" /> Copy join link
            </Button>
            <Button variant="outline" onClick={() => updateRoom({ open: !room.open })}>
              {room.open ? <Lock data-icon="inline-start" /> : <LockOpen data-icon="inline-start" />}
              {room.open ? "Close room" : "Reopen room"}
            </Button>
            <a href={`#/screen/${room.code}`} target="_blank" rel="noreferrer" className={buttonVariants()}>
              <MonitorPlay data-icon="inline-start" /> Open big screen
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="grid content-start gap-6">
          <section aria-labelledby="stage-heading" className="rounded-2xl border-2 border-beat bg-card p-5">
            <h2 id="stage-heading" className="text-xs font-semibold tracking-wider text-beat uppercase">
              On stage
            </h2>
            {spotlight ? (
              <div className="mt-2 grid gap-4">
                <p className="text-2xl leading-snug font-medium text-pretty">{spotlight.text}</p>
                <p className="text-sm text-muted-foreground">
                  {spotlight.author || "Anonymous"} · {voteCount.get(spotlight.id) ?? 0} votes
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => finishStage(spotlight)}>
                    <Check data-icon="inline-start" /> Mark answered
                  </Button>
                  <Button variant="outline" onClick={() => updateRoom({ spotlight: "" })}>
                    <X data-icon="inline-start" /> Take off stage
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-muted-foreground">
                Nothing on stage. Pick a question from the queue and it fills the big screen and every phone.
              </p>
            )}
          </section>

          <section aria-labelledby="pulse-heading" className="rounded-2xl border bg-card p-5">
            <h2 id="pulse-heading" className="text-sm font-semibold">Room reactions</h2>
            <PulseLine beats={beats} height={110} emojiSize="1.25rem" />
          </section>
        </div>

        <Tabs defaultValue="queue" className="grid content-start gap-3">
          <TabsList>
            <TabsTrigger value="queue">Up next ({queue.length})</TabsTrigger>
            <TabsTrigger value="answered">Answered ({answered.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="queue">
            {queue.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                The queue is empty. Share the join link or put the big screen up so people can scan in.
              </p>
            ) : (
              <ul className="grid gap-2">
                {queue.map((question) => (
                  <QuestionItem
                    key={question.id}
                    question={question}
                    votes={voteCount.get(question.id) ?? 0}
                    actions={
                      <>
                        <Button size="sm" onClick={() => putOnStage(question)}>
                          <Megaphone data-icon="inline-start" /> Put on stage
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(question)}>
                          <Trash2 data-icon="inline-start" /> Remove
                        </Button>
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="answered">
            {answered.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Questions you mark answered collect here.
              </p>
            ) : (
              <ul className="grid gap-2">
                {answered.map((question) => (
                  <QuestionItem
                    key={question.id}
                    question={question}
                    votes={voteCount.get(question.id) ?? 0}
                    actions={
                      <Button size="sm" variant="outline" onClick={() => reopen(question)}>
                        Back to queue
                      </Button>
                    }
                  />
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
