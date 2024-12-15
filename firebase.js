import { initializeApp, applicationDefault, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { readFile } from "fs/promises"

const json = JSON.parse(
    await readFile(
        new URL("./firebasekey.json", import.meta.url)
    )
)

initializeApp({
    credential: cert(json)
})
const db = getFirestore();

export const sessionsDb = db.collection("sessions")
export const usersDb = db.collection("users")
