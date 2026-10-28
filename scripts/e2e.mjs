import PocketBase from "pocketbase"
import { EventSource } from "eventsource"
import { Agent, fetch as undiciFetch } from "undici"

const dispatcher = new Agent({ allowH2: process.env.HTTP2 !== "0" })
const fetchViaAgent = (url, init) => undiciFetch(url, { ...init, dispatcher })
globalThis.EventSource = class extends EventSource {
  constructor(url, init) {
    super(url, { ...init, fetch: fetchViaAgent })
  }
}

const BASE = process.env.PB_URL ?? "https://darkcyan-hornet-959302.hostingersite.dev"
const results = []
const check = (name, ok, detail = "") => {
  results.push({ name, ok })
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`)
}
const expectFail = async (promise) => promise.then(() => null, (error) => error.status ?? "error")
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const host = new PocketBase(BASE)
const audienceA = new PocketBase(BASE)
const audienceB = new PocketBase(BASE)
const stranger = new PocketBase(BASE)
for (const client of [host, audienceA, audienceB, stranger]) client.autoCancellation(false)
const email = `pulse-e2e-${Date.now()}@example.com`
const password = "pulse-e2e-password"

await host.collection("users").create({ email, password, passwordConfirm: password })
await host.collection("users").authWithPassword(email, password)
check("host signs up and signs in", host.authStore.isValid)

const strangerEmail = `pulse-stranger-${Date.now()}@example.com`
await stranger.collection("users").create({ email: strangerEmail, password, passwordConfirm: password })
await stranger.collection("users").authWithPassword(strangerEmail, password)

const code = Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("")
const room = await host.collection("rooms").create({ code, title: "E2E room", owner: host.authStore.record.id, open: true })
check("host creates a room", room.code === code)

check("anonymous user cannot create a room", (await expectFail(audienceA.collection("rooms").create({ code: "ZZZZZ", title: "x", owner: room.owner, open: true }))) !== null)
check("user cannot create a room owned by someone else", (await expectFail(stranger.collection("rooms").create({ code: "YYYYY", title: "x", owner: room.owner, open: true }))) !== null)
check("duplicate room code is rejected", (await expectFail(host.collection("rooms").create({ code, title: "dup", owner: room.owner, open: true }))) !== null)

const seen = { questions: [], votes: [], reactions: [] }
const filter = `room = "${room.id}"`
const subscribeStart = Date.now()
await audienceB.collection("questions").subscribe("*", (e) => seen.questions.push({ ...e, at: Date.now() }), { filter })
await audienceB.collection("votes").subscribe("*", (e) => seen.votes.push({ ...e, at: Date.now() }), { filter })
await audienceB.collection("reactions").subscribe("*", (e) => seen.reactions.push({ ...e, at: Date.now() }), { filter })
check("realtime subscription connects", audienceB.realtime.isConnected, `${Date.now() - subscribeStart} ms`)

const t0 = Date.now()
const question = await audienceA.collection("questions").create({ room: room.id, text: "Will PocketBase ship to production?", author: "E2E" })
for (let i = 0; i < 50 && !seen.questions.length; i++) await sleep(50)
check("question reaches another client live", seen.questions.length === 1, `${seen.questions[0]?.at - t0} ms`)

check("audience cannot pre-mark a question answered", (await expectFail(audienceA.collection("questions").create({ room: room.id, text: "sneaky", answered: true }))) !== null)
check("too-short question is rejected", (await expectFail(audienceA.collection("questions").create({ room: room.id, text: "x" }))) !== null)

const voterA = crypto.randomUUID()
const t1 = Date.now()
await audienceA.collection("votes").create({ question: question.id, voter: voterA, room: room.id })
for (let i = 0; i < 50 && !seen.votes.length; i++) await sleep(50)
check("vote reaches another client live", seen.votes.length === 1, `${seen.votes[0]?.at - t1} ms`)
check("same voter cannot vote twice", (await expectFail(audienceA.collection("votes").create({ question: question.id, voter: voterA, room: room.id }))) !== null)

const otherRoom = await stranger.collection("rooms").create({ code: code.split("").reverse().join(""), title: "Other", owner: stranger.authStore.record.id, open: true })
check("vote with a mismatched room is rejected", (await expectFail(audienceA.collection("votes").create({ question: question.id, voter: crypto.randomUUID(), room: otherRoom.id }))) !== null)

const t2 = Date.now()
await Promise.all(["fire", "clap", "rocket"].map((emoji) => audienceA.collection("reactions").create({ room: room.id, emoji })))
for (let i = 0; i < 50 && seen.reactions.length < 3; i++) await sleep(50)
check("reactions reach another client live", seen.reactions.length === 3, `${seen.reactions.at(-1)?.at - t2} ms for 3`)
check("unknown emoji is rejected", (await expectFail(audienceA.collection("reactions").create({ room: room.id, emoji: "poop" }))) !== null)

check("audience cannot mark answered", (await expectFail(audienceA.collection("questions").update(question.id, { answered: true }))) !== null)
check("another signed-in user cannot moderate", (await expectFail(stranger.collection("questions").update(question.id, { answered: true }))) !== null)
const answered = await host.collection("questions").update(question.id, { answered: true })
check("host marks a question answered", answered.answered === true)
check("host cannot rewrite the question text", (await expectFail(host.collection("questions").update(question.id, { text: "edited" }))) !== null)

check("audience cannot remove a question", (await expectFail(audienceA.collection("questions").delete(question.id))) !== null)
const removable = await audienceA.collection("questions").create({ room: room.id, text: "Remove me please" })
for (let i = 0; i < 50 && seen.questions.length < 3; i++) await sleep(50)
const t4 = Date.now()
await host.collection("questions").delete(removable.id)
for (let i = 0; i < 50 && !seen.questions.some((e) => e.action === "delete"); i++) await sleep(50)
const removal = seen.questions.find((e) => e.action === "delete")
check("host removal reaches the audience live", removal?.record.id === removable.id, `${removal?.at - t4} ms`)

await host.collection("rooms").update(room.id, { open: false })
check("closed room refuses questions", (await expectFail(audienceA.collection("questions").create({ room: room.id, text: "Too late?" }))) !== null)
check("closed room refuses reactions", (await expectFail(audienceA.collection("reactions").create({ room: room.id, emoji: "fire" }))) !== null)
check("audience cannot reopen the room", (await expectFail(audienceA.collection("rooms").update(room.id, { open: true }))) !== null)
check("host cannot give the room away", (await expectFail(host.collection("rooms").update(room.id, { owner: stranger.authStore.record.id }))) !== null)

console.log("\nholding the realtime stream idle for 40 s (LiteSpeed used to cut idle SSE at 15 s)…")
await sleep(40000)
const t3 = Date.now()
await host.collection("rooms").update(room.id, { open: true })
await audienceA.collection("reactions").create({ room: room.id, emoji: "heart" })
for (let i = 0; i < 100 && seen.reactions.length < 4; i++) await sleep(50)
check("realtime still delivers after 40 s idle", seen.reactions.length === 4 && audienceB.realtime.isConnected, `${seen.reactions[3]?.at - t3} ms`)

audienceB.realtime.unsubscribe()
await host.collection("rooms").delete(room.id)
await stranger.collection("rooms").delete(otherRoom.id)
check("deleting the room cascades to its questions", (await audienceA.collection("questions").getFullList({ filter })).length === 0)
await host.collection("users").delete(host.authStore.record.id)
await stranger.collection("users").delete(stranger.authStore.record.id)

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
