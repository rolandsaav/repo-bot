import dotenv from "dotenv"
import { App } from "octokit"
import { createNodeMiddleware } from "@octokit/webhooks"
import fs from "fs"
import http from "http"

dotenv.config()

const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;

const privateKey = fs.readFileSync(privateKeyPath, "utf8")

const app = new App({
    appId: appId,
    privateKey: privateKey,
    webhooks: {
        secret: webhookSecret
    }
})

async function handlePush({ octokit, payload }) {
    console.log(`Push event`)
    console.log(payload.sender)
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

const middleware = createNodeMiddleware(app.webhooks, { path });

http.createServer(middleware).listen(port, () => {
    console.log(`Server is listening for events at: ${localWebhookUrl}`);
})
