import { webhookMiddleware } from "./octokit.js"
import { client } from "./twilio.js"
import express from "express"
import axios from "axios"
import session from "express-session"
import dotenv from "dotenv"

dotenv.config()

const verificationSecret = process.env.TWILIO_VERIFY_SID;
const clientSecret = process.env.CLIENT_SECRET
const clientId = process.env.CLIENT_ID
const port = 3000

const expressApp = express()

expressApp.use(webhookMiddleware);

expressApp.use(express.json())
expressApp.use(session({
    secret: "Roland",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 }
}))

expressApp.post("/verifyNumber", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json("Unauthorized")
    }
    const phoneNumber = req.body.phone
    console.log(phoneNumber)
    const verification = await client.verify.v2.services(verificationSecret)
        .verifications
        .create({ to: phoneNumber, channel: "sms" })

    console.log(verification.status)

    res.send(`Verify Number: ${phoneNumber}`)
})

expressApp.post("/checkcode", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Unauthorized");
    }
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

async function exchangeCode(code) {
    const params = {
        "client_id": clientId,
        "client_secret": clientSecret,
        "code": code
    };

    const response = await axios.post("https://github.com/login/oauth/access_token",
        new URLSearchParams(params),
        {
            headers: { 'Accept': 'application/json' }
        })

    return response.data
}

expressApp.get("/", (_, res) => {
    res.send(`<a href="https://www.github.com/login/oauth/authorize?client_id=${clientId}">Login with Github</a>`)
})

expressApp.get("/github/callback", async (req, res) => {
    const code = req.query.code

    const tokenInfo = await exchangeCode(code);

    const accessToken = tokenInfo.access_token;

    const userResponse = await axios.get("https://api.github.com/user", {
        headers: {
            "Accept": 'application/json',
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        }
    })

    const userData = userResponse.data

    console.log(userData.login)
    console.log(tokenInfo)

    req.session.user = accessToken

    res.send(`Successfully authorized! Got code ${code}`)
})

expressApp.get("/auth/status", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json("Unauthorized")
    }
    return res.status(200).send(`Authorized: ${req.session.user}`)
})

expressApp.listen(port, () => {
    console.log(`Server is listening on port: ${port}`)
})

