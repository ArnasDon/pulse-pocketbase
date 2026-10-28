import { EventSource } from "eventsource"
import PocketBase from "pocketbase"
import { Agent, fetch as undiciFetch } from "undici"

const dispatcher = new Agent({ allowH2: true })
globalThis.EventSource = class extends EventSource {
  constructor(url, init) {
    super(url, { ...init, fetch: (u, i) => undiciFetch(u, { ...i, dispatcher }) })
  }
}
const BASE = "https://darkcyan-hornet-959302.hostingersite.dev"
const host = new PocketBase(BASE)
const audience = new PocketBase(BASE)
const email = `pulse-probe-${Date.now()}@example.com`
await host.collection("users").create({ email, password: "pulse-probe-pass", passwordConfirm: "pulse-probe-pass" })
await host.collection("users").authWithPassword(email, "pulse-probe-pass")
const room = await host.collection("rooms").create({ code: "PRB" + Math.floor(10 + Math.random() * 89), title: "probe", owner: host.authStore.record.id, open: true })
const q = await audience.collection("questions").create({ room: room.id, text: "probe question" })
const events = []
await audience.collection("questions").subscribe("*", (e) => events.push(`${e.action} hidden=${e.record.hidden}`))
await host.collection("questions").update(q.id, { hidden: true })
await new Promise((r) => setTimeout(r, 2000))
console.log("audience events after hide:", events.length ? events : "none")
await host.collection("questions").update(q.id, { hidden: false })
await new Promise((r) => setTimeout(r, 2000))
console.log("audience events after unhide:", events)
audience.realtime.unsubscribe()
await host.collection("rooms").delete(room.id)
await host.collection("users").delete(host.authStore.record.id)
