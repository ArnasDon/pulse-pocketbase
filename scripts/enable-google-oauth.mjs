import fs from "node:fs"
import PocketBase from "pocketbase"

const creds = JSON.parse(fs.readFileSync(new URL("../.pb-superuser.json", import.meta.url), "utf8"))
const googleFile = new URL("../.google-oauth.json", import.meta.url)
const google = fs.existsSync(googleFile) ? JSON.parse(fs.readFileSync(googleFile, "utf8")) : {}
const clientId = process.env.GOOGLE_CLIENT_ID ?? google.clientId
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? google.clientSecret
const disable = process.argv.includes("--disable")

if (!disable && (!clientId || !clientSecret)) {
  console.error("Put {\"clientId\": \"…\", \"clientSecret\": \"…\"} in .google-oauth.json, or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
  process.exit(1)
}

const pb = new PocketBase(`https://${creds.domain}`)
await pb.collection("_superusers").authWithPassword(creds.superuser_email, creds.superuser_password)
const users = await pb.collections.getOne("users")
await pb.collections.update(users.id, {
  oauth2: {
    ...users.oauth2,
    enabled: !disable,
    mappedFields: { ...users.oauth2.mappedFields, name: "name", avatarURL: "avatar" },
    providers: disable ? [] : [{ name: "google", clientId, clientSecret }],
  },
})

const methods = await new PocketBase(`https://${creds.domain}`).collection("users").listAuthMethods()
console.log(`Google sign-in ${methods.oauth2.providers.some((p) => p.name === "google") ? "enabled" : "disabled"}.`)
console.log(`Authorized redirect URI for Google Cloud: https://${creds.domain}/api/oauth2-redirect`)
