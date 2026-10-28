import { cn } from "@/lib/utils"

export function Logo({ className, href = "#/" }: { className?: string; href?: string }) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-heading text-2xl leading-none font-extrabold tracking-wide uppercase focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
        className,
      )}
    >
      <svg viewBox="0 0 28 16" className="h-[0.8em] w-auto text-beat" aria-hidden>
        <path d="M0 10h7l2-3 3 8 4-15 3 10h9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      Pulse
    </a>
  )
}
