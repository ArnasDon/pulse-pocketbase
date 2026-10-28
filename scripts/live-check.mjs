import { spawn } from "node:child_process"
import fs from "node:fs"
import PocketBase from "pocketbase"

const origin = process.argv[2] ?? "https://darkcyan-hornet-959302.hostingersite.dev"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--remote-debugging-port=9334", "--hide-scrollbars",
  `--user-data-dir=${process.env.TMPDIR}/chrome-pulse-live`, "about:blank",
], { stdio: "ignore" })
let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  target = await fetch("http://127.0.0.1:9334/json").then((r) => r.json()).then((l) => l.find((t) => t.type === "page")).catch(() => null)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r))
let id = 0
const pending = new Map()
ws.addEventListener("message", (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg.result)
})
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result.value

await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false })
await send("Page.navigate", { url: `${origin}/#/screen/PULSE` })
for (let i = 0; i < 40 && !(await evaluate("document.body.innerText.includes('Live')")); i++) await sleep(250)
console.log("presenter screen connected:", await evaluate("document.body.innerText.includes('Live')"))

const audience = new PocketBase(origin)
audience.autoCancellation(false)
const room = await audience.collection("rooms").getFirstListItem('code = "PULSE"')
const questionStat = "document.querySelector('dl dd')?.innerText"
const before = Number(await evaluate(questionStat))
const text = `Live check ${new Date().toISOString().slice(11, 19)}: can you see this?`
const t0 = Date.now()
const question = await audience.collection("questions").create({ room: room.id, text, author: "Live check" })
let seenAt = null
for (let i = 0; i < 100 && !seenAt; i++) {
  if (Number(await evaluate(questionStat)) === before + 1) seenAt = Date.now()
  else await sleep(25)
}
console.log("question counter on presenter screen updated:", seenAt ? `${seenAt - t0} ms after the POST started` : "NOT SEEN")

const votes = 10
await Promise.all(Array.from({ length: votes }, () => audience.collection("votes").create({ question: question.id, voter: crypto.randomUUID(), room: room.id })))
await Promise.all(["fire", "rocket", "clap", "heart", "mind_blown", "laugh", "fire", "rocket"].map((emoji) => audience.collection("reactions").create({ room: room.id, emoji })))
await sleep(900)
const floating = await evaluate("document.querySelectorAll('.pulse-float').length")
const topQuestion = await evaluate("document.querySelector('ol li p')?.innerText")
console.log("floating emoji on screen:", floating)
console.log("top question after 10 votes:", topQuestion === text ? "the new question (re-ranked live)" : topQuestion)
const { data } = await send("Page.captureScreenshot", { format: "png" })
fs.writeFileSync("shots/live-check.png", Buffer.from(data, "base64"))

const hostCreds = JSON.parse(fs.readFileSync(new URL("../.pb-demo-host.json", import.meta.url), "utf8"))
const host = new PocketBase(origin)
await host.collection("users").authWithPassword(hostCreds.email, hostCreds.password)
await host.collection("questions").delete(question.id)
ws.close()
chrome.kill()
