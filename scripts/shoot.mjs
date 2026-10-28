import { spawn } from "node:child_process"
import fs from "node:fs"

const [origin, outDir] = process.argv.slice(2)
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--remote-debugging-port=9333", "--hide-scrollbars",
  `--user-data-dir=${process.env.TMPDIR}/chrome-pulse-cdp`, "about:blank",
], { stdio: "ignore" })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  target = await fetch("http://127.0.0.1:9333/json").then((r) => r.json()).then((l) => l.find((t) => t.type === "page")).catch(() => null)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r))
let id = 0
const pending = new Map()
const errors = []
ws.addEventListener("message", (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg.result)
  if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text)
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "))
})
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
await send("Runtime.enable")
await send("Page.enable")

const shots = [
  ["home", 1280, 820, "/", false],
  ["screen", 1600, 900, "/#/screen/PULSE", false],
  ["room-mobile", 390, 844, "/#/r/PULSE", true],
]
for (const [name, width, height, path, mobile] of shots) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile })
  await send("Page.navigate", { url: "about:blank" })
  await send("Page.navigate", { url: origin + path })
  await sleep(7000)
  const { data } = await send("Page.captureScreenshot", { format: "png" })
  fs.writeFileSync(`${outDir}/${name}.png`, Buffer.from(data, "base64"))
  const info = await send("Runtime.evaluate", { expression: "document.body.innerText.slice(0, 160).replace(/\\n+/g, ' | ')", returnByValue: true })
  console.log(name, "→", info.result.value)
}
console.log("console errors:", errors.length ? errors : "none")
ws.close()
chrome.kill()
