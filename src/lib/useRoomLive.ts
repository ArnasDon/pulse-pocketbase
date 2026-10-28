import { useEffect, useMemo, useRef, useState } from "react"
import { pb, type Question, type Reaction, type Room, type Vote } from "@/lib/pb"

type Status = "loading" | "ready" | "missing"

export function useRoomLive(code: string, onReaction?: (reaction: Reaction) => void) {
  const [status, setStatus] = useState<Status>("loading")
  const [room, setRoom] = useState<Room | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [connected, setConnected] = useState(false)
  const reactionHandler = useRef(onReaction)
  useEffect(() => {
    reactionHandler.current = onReaction
  }, [onReaction])

  useEffect(() => {
    let cancelled = false
    const unsubscribers: Array<() => Promise<void>> = []

    async function load() {
      const found = await pb
        .collection("rooms")
        .getFirstListItem<Room>(pb.filter("code = {:code}", { code }))
        .catch(() => null)
      if (cancelled) return
      if (!found) {
        setStatus("missing")
        return
      }
      setRoom(found)
      const byRoom = pb.filter("room = {:room}", { room: found.id })
      const [questionList, voteList] = await Promise.all([
        pb.collection("questions").getFullList<Question>({ filter: byRoom, sort: "-created" }),
        pb.collection("votes").getFullList<Vote>({ filter: byRoom, fields: "id,question,voter,room" }),
      ])
      if (cancelled) return
      setQuestions(questionList)
      setVotes(voteList)
      setStatus("ready")

      unsubscribers.push(
        await pb.collection("rooms").subscribe<Room>(found.id, (event) => {
          if (event.action === "update") setRoom(event.record)
          if (event.action === "delete") setStatus("missing")
        }),
        await pb.collection("questions").subscribe<Question>(
          "*",
          (event) => {
            setQuestions((current) => {
              const rest = current.filter((q) => q.id !== event.record.id)
              return event.action === "delete" ? rest : [event.record, ...rest]
            })
          },
          { filter: byRoom },
        ),
        await pb.collection("votes").subscribe<Vote>(
          "*",
          (event) => {
            if (event.action !== "create") return
            setVotes((current) =>
              current.some((v) => v.id === event.record.id) ? current : [...current, event.record],
            )
          },
          { filter: byRoom },
        ),
        await pb.collection("reactions").subscribe<Reaction>(
          "*",
          (event) => {
            if (event.action === "create") reactionHandler.current?.(event.record)
          },
          { filter: byRoom },
        ),
      )
      if (cancelled) unsubscribers.forEach((unsubscribe) => unsubscribe())
    }

    load().catch(() => !cancelled && setStatus("missing"))
    return () => {
      cancelled = true
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [code])

  useEffect(() => {
    const track = () => setConnected(pb.realtime.isConnected)
    track()
    const timer = window.setInterval(track, 2000)
    return () => window.clearInterval(timer)
  }, [])

  const voteCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const vote of votes) counts.set(vote.question, (counts.get(vote.question) ?? 0) + 1)
    return counts
  }, [votes])

  const ranked = useMemo(
    () =>
      [...questions].sort(
        (a, b) =>
          Number(a.answered) - Number(b.answered) ||
          (voteCount.get(b.id) ?? 0) - (voteCount.get(a.id) ?? 0) ||
          b.created.localeCompare(a.created),
      ),
    [questions, voteCount],
  )

  return { status, room, questions: ranked, votes, voteCount, connected, setVotes }
}
