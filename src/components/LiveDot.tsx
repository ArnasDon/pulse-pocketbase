import { cn } from "@/lib/utils"

export function LiveDot({ connected, className }: { connected: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <span className="relative flex size-2">
        {connected && <span className="live-ring absolute inline-flex size-full rounded-full bg-beat" />}
        <span className={cn("relative inline-flex size-2 rounded-full", connected ? "bg-beat" : "bg-muted-foreground/50")} />
      </span>
      {connected ? "Live" : "Connecting…"}
    </span>
  )
}
