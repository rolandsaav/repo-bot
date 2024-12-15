import dotenv from "dotenv"
import { App } from "octokit"
import fs from "fs"
import { createNodeMiddleware } from "@octokit/webhooks"
import { client } from "./twilio.js"

dotenv.config()
const privateKeyPath = process.env.PRIVATE_KEY_PATH;
const webhookSecret = process.env.WEBHOOK_SECRET;
const appId = process.env.APP_ID;
const privateKey = fs.readFileSync(privateKeyPath, "utf8")
const path = "/api/webhook";

const app = new App({
    appId: appId,
    privateKey: privateKey,
    webhooks: {
        secret: webhookSecret
    }
})

async function handlePush({ octokit, payload }) {
    console.log("Push event")
    console.log(payload.sender)

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

export const webhookMiddleware = createNodeMiddleware(app.webhooks, { path });
