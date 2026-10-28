import { useMemo, useRef, useState, type FormEvent } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { LiveDot } from "@/components/LiveDot"
import { Logo } from "@/components/Logo"
import { QuestionItem } from "@/components/QuestionItem"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { EMOJI, errorMessage, pb, readMine, rememberMine, voterId, type EmojiKey, type Question, type Vote } from "@/lib/pb"
import { useRoomLive } from "@/lib/useRoomLive"
import { cn } from "@/lib/utils"

const NAME_KEY = "pulse.name"
const EMOJI_LABELS: Record<EmojiKey, string> = {
  fire: "Fire",
  clap: "Applause",
  heart: "Love it",
  laugh: "Funny",
  mind_blown: "Mind blown",
  rocket: "Ship it",
}

function readName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ""
  } catch {
    return ""
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    return
  }
}

export function RoomPage({ code }: { code: string }) {
  const { status, room, questions, votes, voteCount, connected, setVotes } = useRoomLive(code)
  const [text, setText] = useState("")
  const [name, setName] = useState(readName)
  const [sending, setSending] = useState(false)
  const [sort, setSort] = useState<"top" | "new">("top")
  const [mine, setMine] = useState(readMine)
  const [lastSent, setLastSent] = useState<{ key: EmojiKey; n: number } | null>(null)
  const lastReaction = useRef(0)

  const myVotes = useMemo(
    () => new Set(votes.filter((vote) => vote.voter === voterId).map((vote) => vote.question)),
    [votes],
  )
  const open = questions.filter((question) => !question.answered)
  const answered = questions.filter((question) => question.answered)
  const sorted = sort === "top" ? open : [...open].sort((a, b) => b.created.localeCompare(a.created))
  const spotlight = questions.find((question) => question.id === room?.spotlight)

  if (status === "missing") {
    return (
      <main className="mx-auto grid min-h-svh max-w-md content-center gap-4 px-4 text-center">
        <h1 className="font-heading text-4xl font-bold uppercase">No room called {code}</h1>
        <p className="text-muted-foreground">Check the 5-character code on the big screen and try again.</p>
        <a href="#/" className={buttonVariants({ variant: "outline" })}>
          Enter a different code
        </a>
      </main>
    )
  }

  if (status === "loading" || !room) {
    return <main className="grid min-h-svh place-items-center text-muted-foreground">Joining {code}…</main>
  }

  const ask = async (event: FormEvent) => {
    event.preventDefault()
    if (text.trim().length < 3) {
      toast.error("Write at least 3 characters, then send your question.")
      return
    }
    setSending(true)
    try {
      const created = await pb.collection("questions").create<Question>({ room: room.id, text: text.trim(), author: name.trim() })
      rememberMine(created.id)
      setMine(readMine())
      setText("")
      saveName(name.trim())
      setSort("new")
      toast.success("Question sent. It’s on every screen now.")
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSending(false)
    }
  }

  const vote = async (question: Question) => {
    try {
      const created = await pb.collection("votes").create<Vote>({ question: question.id, voter: voterId, room: room.id })
      setVotes((current) => (current.some((v) => v.id === created.id) ? current : [...current, created]))
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const react = (key: EmojiKey) => {
    const now = Date.now()
    if (now - lastReaction.current < 600) return
    lastReaction.current = now
    setLastSent((current) => ({ key, n: (current?.n ?? 0) + 1 }))
    pb.collection("reactions")
      .create({ room: room.id, emoji: key })
      .catch((error) => toast.error(errorMessage(error)))
  }

  return (
    <div className="min-h-svh pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <Logo className="text-xl" />
          <div className="min-w-0 flex-1 text-right">
            <h1 className="truncate text-sm font-semibold">{room.title}</h1>
            <p className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <span className="code-display" translate="no">{room.code}</span>
              <LiveDot connected={connected} />
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-5 px-4 py-5">
        {spotlight && (
          <section aria-label="On stage now" className="rounded-xl border-2 border-beat bg-beat-soft p-4">
            <p className="text-xs font-semibold tracking-wider text-beat uppercase">On stage now</p>
            <p className="mt-1 text-lg leading-snug font-medium text-pretty">{spotlight.text}</p>
          </section>
        )}

        {room.open ? (
          <form onSubmit={ask} className="grid gap-2 rounded-xl border bg-card p-3">
            <label htmlFor="question" className="text-sm font-medium">
              Ask the room
            </label>
            <Textarea
              id="question"
              name="question"
              placeholder="What would you like to know…"
              value={text}
              maxLength={280}
              autoComplete="off"
              onChange={(e) => setText(e.target.value)}
              className="min-h-20 resize-none bg-background"
            />
            <div className="flex items-center gap-2">
              <Input
                aria-label="Your name (optional)"
                name="nickname"
                placeholder="Your name (optional)…"
                value={name}
                maxLength={40}
                autoComplete="nickname"
                onChange={(e) => setName(e.target.value)}
                className="bg-background"
              />
              <Button type="submit" disabled={sending}>
                <Send data-icon="inline-start" /> {sending ? "Sending…" : "Send"}
              </Button>
            </div>
            <p className="text-right text-xs text-muted-foreground tabular-nums" aria-live="polite">
              {text.length}/280
            </p>
          </form>
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            The host closed this room for new questions and reactions. You can still read everything below.
          </p>
        )}

        <section className="grid gap-3" aria-labelledby="questions-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="questions-heading" className="font-heading text-2xl font-bold uppercase" aria-live="polite">
              {open.length} {open.length === 1 ? "question" : "questions"}
            </h2>
            <Tabs value={sort} onValueChange={(value) => setSort(value as "top" | "new")}>
              <TabsList>
                <TabsTrigger value="top">Top</TabsTrigger>
                <TabsTrigger value="new">Newest</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {open.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nothing asked yet. Your question will be the first one on the big screen.
            </p>
          ) : (
            <ul className="grid gap-2">
              {sorted.map((question) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  votes={voteCount.get(question.id) ?? 0}
                  voted={myVotes.has(question.id)}
                  canVote={room.open}
                  mine={mine.includes(question.id)}
                  onStage={question.id === room.spotlight}
                  onVote={() => vote(question)}
                />
              ))}
            </ul>
          )}
          {answered.length > 0 && (
            <details className="group rounded-xl border bg-card/60 p-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Answered ({answered.length})
              </summary>
              <ul className="mt-3 grid gap-2">
                {answered.map((question) => (
                  <QuestionItem
                    key={question.id}
                    question={question}
                    votes={voteCount.get(question.id) ?? 0}
                    mine={mine.includes(question.id)}
                  />
                ))}
              </ul>
            </details>
          )}
        </section>
      </main>

      {room.open && (
        <nav
          aria-label="Send a reaction to the big screen"
          className="fixed inset-x-0 bottom-0 z-10 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        >
          <div className="mx-auto grid max-w-xl grid-cols-6 gap-1.5 px-3 py-3">
            {(Object.keys(EMOJI) as EmojiKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => react(key)}
                aria-label={`Send ${EMOJI_LABELS[key]}`}
                className="grid h-12 place-items-center rounded-xl text-2xl transition-[transform,background-color] hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-90"
              >
                <span key={lastSent?.key === key ? lastSent.n : 0} className={cn(lastSent?.key === key && "beat-in")}>
                  {EMOJI[key]}
                </span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
