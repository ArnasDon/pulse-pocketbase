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
const text = `Live check ${new Date().toISOString().slice(11, 19)}: can you see this?`
const t0 = Date.now()
const question = await audience.collection("questions").create({ room: room.id, text, author: "Live check" })
const votes = 10
await Promise.all(Array.from({ length: votes }, () => audience.collection("votes").create({ question: question.id, voter: crypto.randomUUID(), room: room.id })))
await Promise.all(["fire", "rocket", "clap", "heart", "mind_blown", "laugh", "fire", "rocket"].map((emoji) => audience.collection("reactions").create({ room: room.id, emoji })))
await sleep(900)
const hostCreds = JSON.parse(fs.readFileSync(new URL("../.pb-demo-host.json", import.meta.url), "utf8"))
const host = new PocketBase(origin)
await host.collection("users").authWithPassword(hostCreds.email, hostCreds.password)
const emojiOnLine = await evaluate("document.querySelectorAll('.beat-in').length")
console.log("emoji riding the pulse line:", emojiOnLine)
const t1 = Date.now()
await host.collection("rooms").update(room.id, { spotlight: question.id })
let staged = null
for (let i = 0; i < 100 && !staged; i++) {
  if (await evaluate(`document.body.innerText.includes("ON STAGE NOW") && document.body.innerText.includes(${JSON.stringify(text)})`)) staged = Date.now()
  else await sleep(25)
}
console.log("question on stage on the big screen:", staged ? `${staged - t1} ms after the host clicked` : "NOT SEEN")
await Promise.all(["fire", "clap", "rocket"].map((emoji) => audience.collection("reactions").create({ room: room.id, emoji })))
await sleep(1200)
const { data } = await send("Page.captureScreenshot", { format: "png" })
fs.writeFileSync("shots/live-check.png", Buffer.from(data, "base64"))

await host.collection("rooms").update(room.id, { spotlight: "" })
await host.collection("questions").delete(question.id)
ws.close()
chrome.kill()
