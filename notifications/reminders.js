import functions from "@google-cloud/functions-framework"

import { usersDb } from "./firebase.js"
import { client } from "./twilio.js"

import { Timestamp } from "@google-cloud/firestore"

// Register an HTTP function with the Functions Framework that will be executed
// when you make an HTTP request to the deployed function's endpoint.
functions.http('reminders', async (req, res) => {
    console.log("Send Updates begin")
    const usersUpdateQueryResponse = await usersDb.where('lastPush', '<', Timestamp.fromMillis(Date.now() - 1000 * 60 * 60)).get()

    const textPromises = []
    usersUpdateQueryResponse.forEach(userDoc => {
        const data = userDoc.data();
        const message = client.messages.create({
            body: "You haven't pushed any code recently! Get on it!",
            from: "+18557841776",
            to: "+18777804236",
        })

        textPromises.push(message)
    })

    await Promise.all(textPromises)

    res.status(200).send(`Sent reminders to ${usersUpdateQueryResponse.size} users`)
});
