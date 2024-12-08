import dotenv from "dotenv"
import { App } from "octokit"
import { createNodeMiddleware } from "@octokit/webhooks"
import { createNodeMiddleware as createOtherMiddleware } from "@octokit/app"
import fs from "fs"
import http from "http"
import { client } from "./twilio.js"
import express from "express"

dotenv.config()

const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;
const verificationSecret = process.env.TWILIO_VERIFY_SID;

const privateKey = fs.readFileSync(privateKeyPath, "utf8")

const app = new App({
    appId: appId,
    privateKey: privateKey,
    webhooks: {
        secret: webhookSecret
    }
})


async function verifyNumber(phoneNumber) {
    const verification = await client.verify.v2.services(verificationSecret)
        .verifications
        .create({ to: phoneNumber, channel: "sms" })
    console.log(verification.sid)
}

async function handlePush({ octokit, payload }) {
    console.log(`Push event`)
    console.log(payload.sender.login)

    const message = await client.messages.create({
        body: "You made a push request. Good job!",
        from: "+18557841776",
        to: "+18777804236",
    })

    console.log(message.body)
}

app.webhooks.on("push", handlePush)

app.webhooks.onError((error) => {
    if (error.name === "AggregateError") {
        console.error(`Error processing request: ${error.event}`);
    } else {
        console.error(error);
    }
});

const port = 3000;
const host = "localhost"
const path = "/api/webhook";
const localWebhookUrl = `http://${host}:${port}${path}`

const webhookMiddleware = createNodeMiddleware(app.webhooks, { path });

const expressApp = express()

expressApp.use(webhookMiddleware);

expressApp.use(express.json())

expressApp.post("/verifyNumber", (req, res) => {
    const phoneNumber = req.body.phone

    console.log(phoneNumber)

    res.send(`Verify Number: ${phoneNumber}`)
})

expressApp.listen(port, () => {
    console.log(`Server is listening on port: ${port}`)
})

