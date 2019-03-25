// imports
const express = require("express");
const consola = require("consola");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const passport = require("passport");
const { Nuxt, Builder } = require("nuxt");

const users = require("./routes/api/users");
const profiles = require("./routes/api/profiles");
const tags = require("./routes/api/tags");

//Express App
const app = express();

//BodyParser Middleware
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

app.use(bodyParser.json({ limit: "10mb", extended: true }));

//DB & Mongoose

const db = require("./config/keys").mongoURI;

mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => console.log(" 💾 Database connected"))
  .catch(error => console.log(error));

//Passport Middleware
app.use(passport.initialize({}));

//Routes

app.get("/api", (req, res) => res.send({ message: "🖖 Hello World 🖖" }));
app.use("/api/users", users);
app.use("/api/profiles", profiles);
app.use("/api/tags", tags);

//Port
const host = process.env.HOST || "127.0.0.1";
const port = process.env.PORT || 3000;
app.set("port", port);

// Import and Set Nuxt.js options
let config = require("../nuxt.config.js");
config.dev = !(process.env.NODE_ENV === "production");

async function start() {
  // Init Nuxt.js
  const nuxt = new Nuxt(config);

  // Build only in dev mode
  if (config.dev) {
    const builder = new Builder(nuxt);
    await builder.build();
  }

  // Give nuxt middleware to express
  app.use(nuxt.render);

  // Listen the server
  app.listen(port, host);
  consola.ready({
    message: `🚀 Server listening on http://${host}:${port}`,
    badge: true
  });
}
start();
