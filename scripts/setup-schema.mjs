import fs from "node:fs"
import PocketBase from "pocketbase"

const creds = JSON.parse(fs.readFileSync(new URL("../.pb-superuser.json", import.meta.url), "utf8"))
const pb = new PocketBase(`https://${creds.domain}`)
await pb.collection("_superusers").authWithPassword(creds.superuser_email, creds.superuser_password)

const EMOJI = ["fire", "clap", "heart", "laugh", "mind_blown", "rocket"]
const ownerOnly = "room.owner = @request.auth.id"

async function upsert(def) {
  const existing = await pb.collections.getOne(def.name).catch(() => null)
  const keep = (existing?.fields ?? []).filter(
    (field) => !field.system && !def.fields.some((wanted) => wanted.name === field.name),
  )
  const saved = existing
    ? await pb.collections.update(existing.id, { ...def, fields: [...def.fields, ...keep] })
    : await pb.collections.create(def)
  console.log(`${existing ? "updated" : "created"} ${saved.name} (${saved.id})`)
  return saved
}

const timestamps = [
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
]

const users = await pb.collections.getOne("users")
await pb.collections.update(users.id, { createRule: "" })

const rooms = await upsert({
  name: "rooms",
  type: "base",
  listRule: "",
  viewRule: "",
  createRule: '@request.auth.id != "" && @request.body.owner = @request.auth.id',
  updateRule:
    'owner = @request.auth.id && @request.body.owner:changed = false && (@request.body.spotlight:isset = false || @request.body.spotlight = "" || @request.body.spotlight.room = id)',
  deleteRule: "owner = @request.auth.id",
  fields: [
    { name: "code", type: "text", required: true, min: 5, max: 5, pattern: "^[A-Z0-9]{5}$" },
    { name: "title", type: "text", required: true, min: 2, max: 80 },
    { name: "owner", type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
    { name: "open", type: "bool" },
    ...timestamps,
  ],
  indexes: ["CREATE UNIQUE INDEX idx_rooms_code ON rooms (code)"],
})

const questions = await upsert({
  name: "questions",
  type: "base",
  listRule: "",
  viewRule: "",
  createRule: "room.open = true && @request.body.answered:isset = false",
  updateRule: `${ownerOnly} && @request.body.room:changed = false && @request.body.text:changed = false`,
  deleteRule: ownerOnly,
  fields: [
    { name: "room", type: "relation", required: true, collectionId: rooms.id, maxSelect: 1, cascadeDelete: true },
    { name: "text", type: "text", required: true, min: 3, max: 280 },
    { name: "author", type: "text", max: 40 },
    { name: "answered", type: "bool" },
    ...timestamps,
  ],
  indexes: ["CREATE INDEX idx_questions_room ON questions (room)"],
})

const roomFields = (await pb.collections.getOne(rooms.id)).fields.filter((field) => field.name !== "spotlight")
await pb.collections.update(rooms.id, {
  fields: [...roomFields, { name: "spotlight", type: "relation", collectionId: questions.id, maxSelect: 1, cascadeDelete: false }],
})
console.log("updated rooms (spotlight)")

await upsert({
  name: "votes",
  type: "base",
  listRule: "",
  viewRule: "",
  createRule: "question.room.open = true && @request.body.room = question.room",
  updateRule: null,
  deleteRule: null,
  fields: [
    { name: "question", type: "relation", required: true, collectionId: questions.id, maxSelect: 1, cascadeDelete: true },
    { name: "voter", type: "text", required: true, min: 16, max: 64, pattern: "^[a-zA-Z0-9-]+$" },
    { name: "room", type: "relation", required: true, collectionId: rooms.id, maxSelect: 1, cascadeDelete: true },
    ...timestamps,
  ],
  indexes: ["CREATE UNIQUE INDEX idx_votes_once ON votes (question, voter)", "CREATE INDEX idx_votes_room ON votes (room)"],
})

await upsert({
  name: "reactions",
  type: "base",
  listRule: "",
  viewRule: "",
  createRule: "room.open = true",
  updateRule: null,
  deleteRule: null,
  fields: [
    { name: "room", type: "relation", required: true, collectionId: rooms.id, maxSelect: 1, cascadeDelete: true },
    { name: "emoji", type: "select", required: true, maxSelect: 1, values: EMOJI },
    ...timestamps,
  ],
  indexes: ["CREATE INDEX idx_reactions_room ON reactions (room)"],
})
