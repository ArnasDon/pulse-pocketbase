import { useEffect, useState, type FormEvent } from "react"
import { ArrowRight, LogOut, MonitorPlay, Radio, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { errorMessage, newRoomCode, pb, useAuth, type Room } from "@/lib/pb"
import { go } from "@/lib/router"

function JoinCard() {
  const [code, setCode] = useState("")
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (code.trim().length === 5) go(`/r/${code.trim().toUpperCase()}`)
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-4" /> Join a room
        </CardTitle>
        <CardDescription>Enter the 5-character code on the big screen.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex gap-2">
          <Input
            aria-label="Room code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 5))}
            placeholder="K7Q2P"
            className="font-mono tracking-[0.3em] uppercase"
            autoCapitalize="characters"
          />
          <Button type="submit" disabled={code.length !== 5}>
            Join <ArrowRight />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const run = async (mode: "signin" | "signup") => {
    setBusy(true)
    try {
      if (mode === "signup") {
        await pb.collection("users").create({ email, password, passwordConfirm: password })
      }
      await pb.collection("users").authWithPassword(email, password)
      toast.success(mode === "signup" ? "Account created" : "Signed in")
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const fields = (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
    </div>
  )

  return (
    <Tabs defaultValue="signin">
      <TabsList className="w-full">
        <TabsTrigger value="signin">Sign in</TabsTrigger>
        <TabsTrigger value="signup">Create account</TabsTrigger>
      </TabsList>
      <TabsContent value="signin" className="grid gap-4 pt-3">
        {fields}
        <Button disabled={busy} onClick={() => run("signin")}>Sign in</Button>
      </TabsContent>
      <TabsContent value="signup" className="grid gap-4 pt-3">
        {fields}
        <p className="text-muted-foreground text-xs">At least 8 characters. Stored by PocketBase auth.</p>
        <Button disabled={busy} onClick={() => run("signup")}>Create account</Button>
      </TabsContent>
    </Tabs>
  )
}

function HostRooms({ userId }: { userId: string }) {
  const [rooms, setRooms] = useState<Room[]>([])
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
    setBusy(true)
    try {
      const room = await pb.collection("rooms").create<Room>({ code: newRoomCode(), title, owner: userId, open: true })
      go(`/screen/${room.code}`)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={create} className="grid gap-2">
        <Label htmlFor="title">New room</Label>
        <div className="flex gap-2">
          <Input id="title" placeholder="Friday all-hands" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit" disabled={busy || title.trim().length < 2}>
            <Radio /> Go live
          </Button>
        </div>
      </form>
      {rooms.length > 0 && <Separator />}
      <ul className="grid gap-2">
        {rooms.map((room) => (
          <li key={room.id} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{room.title}</p>
              <p className="text-muted-foreground font-mono text-xs">{room.code}</p>
            </div>
            <Badge variant={room.open ? "default" : "secondary"}>{room.open ? "Open" : "Closed"}</Badge>
            <Button size="sm" variant="outline" onClick={() => go(`/r/${room.code}`)}>
              Moderate
            </Button>
            <Button size="sm" onClick={() => go(`/screen/${room.code}`)}>
              <MonitorPlay /> Screen
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Home() {
  const user = useAuth()
  return (
    <main className="mx-auto grid min-h-svh max-w-3xl content-center gap-8 px-4 py-12">
      <header className="grid gap-3 text-center">
        <Badge variant="outline" className="mx-auto">
          Built on PocketBase · Hostinger web hosting
        </Badge>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          Pulse<span className="text-emerald-500">.</span>
        </h1>
        <p className="text-muted-foreground mx-auto max-w-lg text-balance">
          Live Q&A and reactions for your next all-hands. Put the room on the big screen, everyone scans the QR
          code, and questions, votes and emoji land on every screen instantly.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <JoinCard />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorPlay className="size-4" /> Host a room
            </CardTitle>
            <CardDescription>
              {user ? `Signed in as ${user.email}` : "Hosts sign in so only they can moderate."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? <HostRooms userId={user.id} /> : <AuthForm />}
            {user && (
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => pb.authStore.clear()}>
                <LogOut /> Sign out
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
