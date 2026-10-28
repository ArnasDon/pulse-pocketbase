import { cn } from "@/lib/utils"

export function LiveDot({ connected, className }: { connected: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex size-2">
        {connected && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
        <span className={cn("relative inline-flex size-2 rounded-full", connected ? "bg-emerald-500" : "bg-amber-500")} />
      </span>
      {connected ? "Live" : "Connecting"}
    </span>
  )
}
