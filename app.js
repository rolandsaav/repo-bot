import dotenv from "dotenv"
import { App } from "octokit"
import { createNodeMiddleware } from "@octokit/webhooks"
import { createNodeMiddleware as createOtherMiddleware } from "@octokit/app"
import fs from "fs"
import { client } from "./twilio.js"
import express from "express"

dotenv.config()

const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;
const verificationSecret = process.env.TWILIO_VERIFY_SID;
const clientSecret = process.env.CLIENT_SECRET
const clientId = process.env.CLIENT_ID

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
    return verification
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
const path = "/api/webhook";

const webhookMiddleware = createNodeMiddleware(app.webhooks, { path });

const expressApp = express()

expressApp.use(webhookMiddleware);

expressApp.use(express.json())

expressApp.post("/verifyNumber", async (req, res) => {
    const phoneNumber = req.body.phone
    console.log(phoneNumber)
    const verification = await client.verify.v2.services(verificationSecret)
        .verifications
        .create({ to: phoneNumber, channel: "sms" })

    console.log(verification.status)

    res.send(`Verify Number: ${phoneNumber}`)
})

expressApp.post("/checkcode", async (req, res) => {
    const phoneNumber = req.body.phone
    const code = req.body.code

    const verificationCheck = await client.verify.v2.services(verificationSecret)
        .verificationChecks
        .create({ to: phoneNumber, code: code })

    const status = verificationCheck.status

    if (status != "approved") {
        res.send("Approval failed")
    } else {
        res.send("Approved")
    }
})

expressApp.get("/", (req, res) => {
    res.send(`<a href="https://www.github.com/login/oauth/authorize?client_id=${clientId}">Login with Github</a>`)
})

expressApp.get("/github/callback", (req, res) => {
    const code = req.query.code

    res.send(`Successfully authorized! Got code ${code}`)
})

expressApp.listen(port, () => {
    console.log(`Server is listening on port: ${port}`)
})

