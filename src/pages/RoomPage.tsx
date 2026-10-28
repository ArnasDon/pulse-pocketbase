import { useRef, useState, type FormEvent } from "react"
import { ArrowLeft, Lock, LockOpen, MonitorPlay, Send } from "lucide-react"
import { toast } from "sonner"
import { QuestionItem } from "@/components/QuestionItem"
import { LiveDot } from "@/components/LiveDot"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EMOJI, errorMessage, pb, useAuth, voterId, type EmojiKey, type Question, type Vote } from "@/lib/pb"
import { go } from "@/lib/router"
import { useRoomLive } from "@/lib/useRoomLive"

const NAME_KEY = "pulse.name"

function readName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ""
  } catch {
    return ""
  }
}

export function RoomPage({ code }: { code: string }) {
  const user = useAuth()
  const { status, room, questions, votes, voteCount, connected, setVotes } = useRoomLive(code)
  const [text, setText] = useState("")
  const [name, setName] = useState(readName)
  const [sending, setSending] = useState(false)
  const lastReaction = useRef(0)

  if (status === "missing") {
    return (
      <main className="mx-auto grid min-h-svh max-w-md content-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">No room called {code}</h1>
        <p className="text-muted-foreground">Check the code on the big screen and try again.</p>
        <Button variant="outline" onClick={() => go("/")}>
          <ArrowLeft /> Back
        </Button>
      </main>
    )
  }

  if (status === "loading" || !room) {
    return <main className="text-muted-foreground grid min-h-svh place-items-center">Joining {code}…</main>
  }

  const isHost = user?.id === room.owner
  const myVotes = new Set(votes.filter((vote) => vote.voter === voterId).map((vote) => vote.question))

  const ask = async (event: FormEvent) => {
    event.preventDefault()
    setSending(true)
    try {
      await pb.collection("questions").create({ room: room.id, text: text.trim(), author: name.trim() })
      setText("")
      try {
        localStorage.setItem(NAME_KEY, name.trim())
      } catch {
        return
      }
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

  const react = (emoji: EmojiKey) => {
    const now = Date.now()
    if (now - lastReaction.current < 700) return
    lastReaction.current = now
    pb.collection("reactions")
      .create({ room: room.id, emoji })
      .catch((error) => toast.error(errorMessage(error)))
  }

  const toggleAnswered = (question: Question) =>
    pb
      .collection("questions")
      .update(question.id, { answered: !question.answered })
      .catch((error) => toast.error(errorMessage(error)))

  const remove = (question: Question) =>
    pb
      .collection("questions")
      .delete(question.id)
      .catch((error) => toast.error(errorMessage(error)))

  const toggleOpen = () =>
    pb
      .collection("rooms")
      .update(room.id, { open: !room.open })
      .catch((error) => toast.error(errorMessage(error)))

  return (
    <main className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-5 px-4 py-6">
      <header className="flex items-start gap-3">
        <Button variant="ghost" size="icon" aria-label="Home" onClick={() => go("/")}>
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{room.title}</h1>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="font-mono tracking-widest">{room.code}</span>
            <LiveDot connected={connected} />
            {!room.open && <Badge variant="secondary">Closed</Badge>}
          </div>
        </div>
        {isHost && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={toggleOpen}>
              {room.open ? <Lock /> : <LockOpen />}
              {room.open ? "Close" : "Reopen"}
            </Button>
            <Button size="sm" onClick={() => go(`/screen/${room.code}`)}>
              <MonitorPlay /> Screen
            </Button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-6 gap-2" role="group" aria-label="Send a reaction">
        {(Object.keys(EMOJI) as EmojiKey[]).map((key) => (
          <Button
            key={key}
            variant="outline"
            className="h-12 min-w-0 px-0 text-2xl"
            disabled={!room.open}
            onClick={() => react(key)}
            aria-label={key.replace("_", " ")}
          >
            {EMOJI[key]}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent>
          <form onSubmit={ask} className="grid gap-2">
            <Textarea
              aria-label="Your question"
              placeholder={room.open ? "Ask something…" : "This room is closed for new questions"}
              value={text}
              maxLength={280}
              disabled={!room.open}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex gap-2">
              <Input
                aria-label="Your name"
                placeholder="Name (optional)"
                value={name}
                maxLength={40}
                disabled={!room.open}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" disabled={!room.open || sending || text.trim().length < 3}>
                <Send /> Ask
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">
          {questions.length} {questions.length === 1 ? "question" : "questions"}
        </h2>
        <ul className="grid gap-2">
          {questions.map((question) => (
            <QuestionItem
              key={question.id}
              question={question}
              votes={voteCount.get(question.id) ?? 0}
              voted={myVotes.has(question.id)}
              canVote={room.open}
              isHost={isHost}
              onVote={() => vote(question)}
              onToggleAnswered={() => toggleAnswered(question)}
              onRemove={() => remove(question)}
            />
          ))}
        </ul>
        {questions.length === 0 && (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            No questions yet. Be the first.
          </p>
        )}
      </section>
    </main>
  )
}
