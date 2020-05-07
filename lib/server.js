// External dependencies
const fs = require("fs")
const path = require("path")
const express = require("express")
const { createWebhooksApi } = require("@octokit/webhooks")
const { createAppAuth } = require("@octokit/auth-app")
const { graphql } = require("@octokit/graphql")

// Local dependencies
const smeeClient = require(path.join(__dirname, "smee.js"))

// Setup
const port = 64897
const app = express()
const config = JSON.parse(fs.readFileSync("config.json", "utf8"))
const privateKey = fs.readFileSync("gh-app.pem", "utf8")

const smee = smeeClient(config.webproxy_url, port)
smee.start()

// App

// sample to test everything is runing properly on setup
// app.use(express.json())
// app.post("/webhooks", (req, res) => {
//   console.log(req.body)
// })

const webhooks = new createWebhooksApi({ secret: "mysecret", path: "/webhooks" })
app.use(webhooks.middleware)

webhooks.on(["issue_comment.created", "issues.opened", "pull_request.opened"], async (event) => {
  const { payload } = event

  // JSON Web Token under the hood
  const auth = await createAppAuth({
    id: config.github_app_id,
    privateKey: privateKey,
    installationId: payload.installation.id
  })

  const graphqlWithAuth = graphql.defaults({
    request: {
      hook: auth.hook
    }
  })

  try {
    let testQuery = await graphqlWithAuth({
      query: "query: { viewer { login } }"
    })
    console.log(testQuery)
  } catch (err) {
    console.log(err)
  }
})

webhooks.on("error", (error) => {
  console.log(`Error occurred in handler: ${error.stack}`)
})

const listener = app.listen(port, () => {
  console.log("Your app is listening on port " + listener.address().port)
})
