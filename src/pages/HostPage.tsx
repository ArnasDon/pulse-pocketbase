import { useEffect, useState, type FormEvent } from "react"
import { ArrowRight, LogOut, Plus } from "lucide-react"
import { toast } from "sonner"
import { Logo } from "@/components/Logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorMessage, newRoomCode, pb, signInOrUp, useAuth, type Room } from "@/lib/pb"
import { go } from "@/lib/router"

function HostSignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    if (password.length < 8) {
      setError("Use a password of at least 8 characters.")
      return
    }
    setBusy(true)
    try {
      await signInOrUp(email.trim(), password)
    } catch {
      setError("That email already has a Pulse account with a different password. Try the password again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-card p-6" noValidate>
      <div className="grid gap-1">
        <h1 className="font-heading text-4xl font-extrabold uppercase">Host a room</h1>
        <p className="text-sm text-muted-foreground">
          Hosts sign in so only you can moderate your rooms. New here? The same form creates your account.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="you@company.com…"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          aria-invalid={Boolean(error)}
          aria-describedby="password-help"
          onChange={(e) => setPassword(e.target.value)}
        />
        <p id="password-help" role={error ? "alert" : undefined} className={error ? "text-sm text-beat" : "text-xs text-muted-foreground"}>
          {error || "At least 8 characters."}
        </p>
      </div>
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Signing in…" : "Continue"}
      </Button>
    </form>
  )
}

function HostRooms({ userId, email }: { userId: string; email: string }) {
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    pb.collection("rooms")
      .getFullList<Room>({ filter: pb.filter("owner = {:id}", { id: userId }), sort: "-created" })
      .then(setRooms)
      .catch((error) => toast.error(errorMessage(error)))
  }, [userId])

  const create = async (event: FormEvent) => {
    event.preventDefault()
    if (title.trim().length < 2) {
      toast.error("Give the room a name of at least 2 characters.")
      return
    }
    setBusy(true)
    try {
      const room = await pb.collection("rooms").create<Room>({ code: newRoomCode(), title: title.trim(), owner: userId, open: true })
      go(`/host/${room.code}`)
    } catch (error) {
      toast.error(errorMessage(error))
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={create} className="grid gap-3 rounded-2xl border bg-card p-6">
        <h1 className="font-heading text-4xl font-extrabold uppercase">Start a room</h1>
        <Label htmlFor="title">Room name</Label>
        <div className="flex gap-2">
          <Input
            id="title"
            name="room-title"
            autoComplete="off"
            placeholder="Friday all-hands…"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 bg-background"
          />
          <Button type="submit" size="lg" className="h-11" disabled={busy}>
            <Plus data-icon="inline-start" /> {busy ? "Starting…" : "Start room"}
          </Button>
        </div>
      </form>

      <section aria-labelledby="rooms-heading" className="grid gap-3">
        <h2 id="rooms-heading" className="text-sm font-semibold text-muted-foreground">
          Your rooms
        </h2>
        {rooms === null && <p className="text-sm text-muted-foreground">Loading your rooms…</p>}
        {rooms?.length === 0 && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No rooms yet. Name your first one above.
          </p>
        )}
        <ul className="grid gap-2">
          {rooms?.map((room) => (
            <li key={room.id}>
              <a
                href={`#/host/${room.code}`}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-ink focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <span className="code-display w-24 text-2xl font-bold" translate="no">
                  {room.code}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{room.title}</span>
                <Badge variant={room.open ? "default" : "secondary"}>{room.open ? "Open" : "Closed"}</Badge>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        Signed in as {email}
        <Button variant="ghost" size="sm" onClick={() => pb.authStore.clear()}>
          <LogOut data-icon="inline-start" /> Sign out
        </Button>
      </p>
    </div>
  )
}

export function HostPage() {
  const user = useAuth()
  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-2xl items-center px-4 py-5">
        <Logo />
      </header>
      <main className="mx-auto grid max-w-2xl gap-6 px-4 pb-16">
        {user ? <HostRooms userId={user.id} email={user.email} /> : <HostSignIn />}
      </main>
    </div>
  )
}
