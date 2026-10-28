import { Check, ChevronUp, Trash2, Undo2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Question } from "@/lib/pb"

interface QuestionItemProps {
  question: Question
  votes: number
  voted: boolean
  canVote: boolean
  isHost: boolean
  onVote: () => void
  onToggleAnswered: () => void
  onRemove: () => void
}

export function QuestionItem({ question, votes, voted, canVote, isHost, onVote, onToggleAnswered, onRemove }: QuestionItemProps) {
  return (
    <li
      className={cn(
        "animate-in fade-in slide-in-from-top-2 flex gap-3 rounded-xl border bg-card p-3 transition-opacity",
        question.answered && "opacity-60",
      )}
    >
      <Button
        variant={voted ? "default" : "outline"}
        className="h-auto w-12 shrink-0 flex-col gap-0 py-1.5"
        disabled={voted || !canVote}
        onClick={onVote}
        aria-label={voted ? `You upvoted, ${votes} votes` : `Upvote, ${votes} votes`}
      >
        <ChevronUp />
        <span className="font-mono text-sm tabular-nums">{votes}</span>
      </Button>
      <div className="grid min-w-0 flex-1 content-start gap-1.5">
        <p className="text-sm leading-snug break-words">{question.text}</p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <span>{question.author || "Anonymous"}</span>
          {question.answered && <Badge variant="secondary">Answered</Badge>}
        </div>
        {isHost && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button size="xs" variant="outline" onClick={onToggleAnswered}>
              {question.answered ? <Undo2 /> : <Check />}
              {question.answered ? "Reopen" : "Mark answered"}
            </Button>
            <Button size="xs" variant="ghost" onClick={onRemove}>
              <Trash2 /> Remove
            </Button>
          </div>
        )}
      </div>
    </li>
  )
}
