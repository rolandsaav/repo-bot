import { initializeApp, applicationDefault } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

initializeApp({
    credential: applicationDefault()
})
const db = getFirestore();

export const sessionsDb = db.collection("sessions")
export const usersDb = db.collection("users")
