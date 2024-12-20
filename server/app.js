import { webhookMiddleware } from "./octokit.js"
import { Octokit } from "octokit"
import { client } from "./twilio.js"
import express from "express"
import axios from "axios"
import dotenv from "dotenv"
import { sessionsDb, usersDb } from "./firebase.js"
import { v4 as uuidv4 } from "uuid"
import { Timestamp } from "firebase-admin/firestore"
import cookieParser from "cookie-parser"

dotenv.config()

const verificationSecret = process.env.TWILIO_VERIFY_SID;
const clientSecret = process.env.CLIENT_SECRET
const clientId = process.env.CLIENT_ID
const port = parseInt(process.env.PORT) || 3000;

const environmentType = process.env.NODE_ENV || "development"
const baseUrl = environmentType === "development" ? "http://localhost:3000" : "https://repo-bot-32532444194.us-east5.run.app"

if (environmentType === "development") {
    console.log("Running in development environment")
}
else {
    console.log("Running in production environment")
}

const app = express()

app.set("view engine", "ejs");

app.use(webhookMiddleware);

app.use(express.json())
app.use(cookieParser())

const sessionMiddleware = async (req, res, next) => {
    const sessionToken = req.cookies.session
    if (!sessionToken) {
        console.log("No session")
        return res.redirect("/login")
    }
    console.log(sessionToken)

    const sessionDoc = await sessionsDb.doc(sessionToken).get();

    if (!sessionDoc.exists) {
        return res.send("Session doesn't exist")
    }
    console.log("Session exists")

    const sessionData = sessionDoc.data()
    const accessToken = sessionData.accessToken
    console.log(accessToken)
    req.accessToken = accessToken
    next()
}

app.post("/verifyNumber", sessionMiddleware, async (req, res) => {
    const phoneNumber = req.query.phone
    console.log(phoneNumber)
    const verification = await client.verify.v2.services(verificationSecret)
        .verifications
        .create({ to: phoneNumber, channel: "sms" })

    console.log(verification.status)

    res.send(`Verify Number: ${phoneNumber}`)
})

app.post("/checkcode", sessionMiddleware, async (req, res) => {
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

app.get("/login", (req, res) => {
    return res.send(`<a href="https://www.github.com/login/oauth/authorize?client_id=${clientId}">Login with Github</a>`)
})

app.get("/", sessionMiddleware, async (req, res) => {
    const octokit = new Octokit({
        auth: req.accessToken
    })

    const response = await octokit.request('GET /user/repos', {
        Headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })
    const data = response.data
    console.log(`Found ${data.length} repos`)
    const repos = []
    for (let i = 0; i < data.length; i++) {
        repos.push(data[i].name)
    }

    res.render('index', { repos: repos, baseUrl })
})

app.get("/github/callback", async (req, res) => {
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

    const ghUsername = userData.login
    const ghId = userData.id

    const sessionId = uuidv4()
    const session = {
        id: sessionId,
        accessToken: accessToken,
        created: Timestamp.now(),
        expires: Timestamp.fromMillis(Date.now() + 1000 * 60 * 5)
    }

    const setSessionResponse = await sessionsDb.doc(sessionId).set(session)

    if (setSessionResponse.writeTime) {
        console.log("Wrote new session to database")
    }

    console.log(`User: ${ghUsername}, Token: ${accessToken}`)

    console.log(userData)

    const user = {
        id: ghId,
        username: ghUsername,
        lastLogin: Timestamp.now()
    }

    const userRef = usersDb.doc(ghId.toString())

    const setUserResponse = await userRef.set(user, { merge: true })

    res.cookie("session", sessionId, { httpOnly: true })
    res.cookie("roland", "saavedra")
    return res.redirect("/")
})

app.post("/logout", sessionMiddleware, async (req, res) => {
    // invalidate current session in db
    const sessionToken = req.cookies.session
    const deleteSessionResult = await sessionsDb.doc(sessionToken).delete()
    console.log(`Deleted session at ${deleteSessionResult.writeTime.toDate().toString()}`)

    // clear session cookie
    res.clearCookie("session")
    res.status(200).send("You are logged out")
})

app.get("/auth/status", async (req, res) => {
    const sessionToken = req.cookies.session
    if (!sessionToken) {
        return res.json({ loggedIn: false })
    }
    console.log(sessionToken)

    const sessionDoc = await sessionsDb.doc(sessionToken).get();

    if (!sessionDoc.exists) {
        return res.json({ loggedIn: false })
    }
    console.log("Session exists")
    return res.json({ loggedIn: true })
})

app.listen(port, () => {
    console.log(`Server is listening on port: ${port}`)
})

