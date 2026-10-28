import crypto from "node:crypto"
import fs from "node:fs"
import PocketBase from "pocketbase"

const credsFile = new URL("../.pb-demo-host.json", import.meta.url)
const base = `https://${JSON.parse(fs.readFileSync(new URL("../.pb-superuser.json", import.meta.url), "utf8")).domain}`
const pb = new PocketBase(base)
pb.autoCancellation(false)

let creds = fs.existsSync(credsFile) ? JSON.parse(fs.readFileSync(credsFile, "utf8")) : null
if (!creds) {
  creds = { email: "demo-host@pulse.test", password: crypto.randomBytes(12).toString("base64url") }
  await pb.collection("users").create({ ...creds, passwordConfirm: creds.password })
  fs.writeFileSync(credsFile, JSON.stringify(creds, null, 2), { mode: 0o600 })
}
await pb.collection("users").authWithPassword(creds.email, creds.password)

const existing = await pb.collection("rooms").getFirstListItem('code = "PULSE"').catch(() => null)
if (existing) await pb.collection("rooms").delete(existing.id)
const room = await pb.collection("rooms").create({ code: "PULSE", title: "PocketBase on Hostinger — demo", owner: pb.authStore.record.id, open: true })

const questions = [
  ["When does PocketBase go to production?", "Rūta", 9],
  ["Can a Node.js app and a static site share one PocketBase?", "Tomas", 6],
  ["How are backups handled for the SQLite database?", "Eglė", 5],
  ["What happens to realtime when the instance goes to sleep?", "", 3],
  ["Will hPanel get a PocketBase page, or is it MCP and API only?", "Mantas", 2],
  ["Is there a limit on file storage per backend?", "", 1],
]
for (const [text, author, voteCount] of questions) {
  const question = await pb.collection("questions").create({ room: room.id, text, author })
  await Promise.all(
    Array.from({ length: voteCount }, () =>
      pb.collection("votes").create({ question: question.id, voter: crypto.randomUUID(), room: room.id }),
    ),
  )
}
console.log(`seeded room ${room.code} with ${questions.length} questions; host login saved to .pb-demo-host.json`)
