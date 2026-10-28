import { useState, type FormEvent } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { go } from "@/lib/router"

export function CodeInput() {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (code.length !== 5) {
      setError("Room codes have 5 characters. Check the code on the big screen.")
      return
    }
    go(`/r/${code}`)
  }

  return (
    <form onSubmit={submit} className="grid gap-2" noValidate>
      <label htmlFor="room-code" className="text-sm font-medium">
        Room code
      </label>
      <div className="flex gap-2">
        <Input
          id="room-code"
          name="room-code"
          value={code}
          onChange={(event) => {
            setError("")
            setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))
          }}
          placeholder="K7Q2P"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "room-code-error" : undefined}
          className="code-display h-16 flex-1 bg-card px-4 text-4xl font-bold uppercase md:text-4xl"
        />
        <Button type="submit" size="lg" className="h-16 px-6 text-base">
          Join <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      <p id="room-code-error" role="alert" className="min-h-5 text-sm text-beat">
        {error}
      </p>
    </form>
  )
}
