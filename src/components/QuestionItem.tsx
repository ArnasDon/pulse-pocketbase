import type { ReactNode } from "react"
import { ArrowBigUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Question } from "@/lib/pb"

interface QuestionItemProps {
  question: Question
  votes: number
  voted?: boolean
  canVote?: boolean
  mine?: boolean
  onStage?: boolean
  onVote?: () => void
  actions?: ReactNode
}

export function QuestionItem({ question, votes, voted, canVote, mine, onStage, onVote, actions }: QuestionItemProps) {
  const voteLabel = `${votes} ${votes === 1 ? "vote" : "votes"}`
  return (
    <li
      className={cn(
        "flex gap-3 rounded-xl border bg-card p-3 transition-[opacity,border-color] duration-300",
        question.answered && "opacity-55",
        onStage && "border-beat",
      )}
    >
      {onVote ? (
        <button
          type="button"
          onClick={onVote}
          disabled={voted || !canVote}
          aria-pressed={voted}
          aria-label={voted ? `Upvoted, ${voteLabel}` : `Upvote, ${voteLabel}`}
          className={cn(
            "grid h-14 w-12 shrink-0 place-items-center content-center rounded-lg border transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
            voted ? "border-ink bg-ink text-paper" : "bg-background hover:border-ink disabled:opacity-60",
          )}
        >
          <ArrowBigUp className="size-5" aria-hidden />
          <span className="font-heading text-xl leading-none font-bold tabular-nums">{votes}</span>
        </button>
      ) : (
        <div className="grid h-14 w-12 shrink-0 place-items-center content-center rounded-lg bg-background" aria-label={voteLabel}>
          <ArrowBigUp className="size-5 text-muted-foreground" aria-hidden />
          <span className="font-heading text-xl leading-none font-bold tabular-nums">{votes}</span>
        </div>
      )}
      <div className="grid min-w-0 flex-1 content-start gap-1.5">
        <p className="text-[0.95rem] leading-snug text-pretty break-words">{question.text}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">{question.author || "Anonymous"}</span>
          {mine && <Badge variant="outline">You asked</Badge>}
          {onStage && <Badge className="bg-beat text-white">On stage</Badge>}
          {question.answered && <Badge variant="secondary">Answered</Badge>}
        </div>
        {actions && <div className="flex flex-wrap gap-1.5 pt-1">{actions}</div>}
      </div>
    </li>
  )
}
