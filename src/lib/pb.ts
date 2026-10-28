import PocketBase, { type RecordModel } from "pocketbase"
import { useEffect, useState } from "react"

export const pb = new PocketBase(window.location.origin)
pb.autoCancellation(false)

export const EMOJI = {
  fire: "🔥",
  clap: "👏",
  heart: "❤️",
  laugh: "😂",
  mind_blown: "🤯",
  rocket: "🚀",
} as const

export type EmojiKey = keyof typeof EMOJI

export interface Room extends RecordModel {
  code: string
  title: string
  owner: string
  open: boolean
}

export interface Question extends RecordModel {
  room: string
  text: string
  author: string
  answered: boolean
}

export interface Vote extends RecordModel {
  question: string
  voter: string
  room: string
}

export interface Reaction extends RecordModel {
  room: string
  emoji: EmojiKey
}

const VOTER_KEY = "pulse.voter"

function readVoterId() {
  try {
    const stored = localStorage.getItem(VOTER_KEY)
    if (stored) return stored
    const created = crypto.randomUUID()
    localStorage.setItem(VOTER_KEY, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}

export const voterId = readVoterId()

export function newRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
}

export function useAuth() {
  const [user, setUser] = useState(pb.authStore.record)
  useEffect(() => pb.authStore.onChange((_, record) => setUser(record)), [])
  return user
}

export function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { message?: string; data?: Record<string, { message?: string }> } }).response
    const fieldError = Object.values(response?.data ?? {})[0]?.message
    if (fieldError) return fieldError
    if (response?.message) return response.message
  }
  return error instanceof Error ? error.message : "Something went wrong"
}
