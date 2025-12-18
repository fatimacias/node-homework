const express = require("express");
const errorHandler = require("./middleware/error-handler");
const notFound = require("./middleware/not-found");
const authMiddleware = require("./middleware/auth");
const taskRouter = require("./routers/taskRoutes");

const app = express();
app.use(express.json({ limit: "1kb" }));

global.user_id = null;
global.users = [];
global.tasks = [];

app.use("/api/tasks", authMiddleware, taskRouter);

app.use((req, res, next) => {
  console.log("LOG:", req.method, req.path, req.query);
  next();
});

app.post("/api/users/register", (req, res)=>{
    console.log("This data was posted", JSON.stringify(req.body));
    res.send("parsed the data");
});

app.post("/api/users/register", (req, res)=>{
    const newUser = {...req.body}; 
    global.users.push(newUser);
    delete req.body.password;
    res.status(201).json(req.body);
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.post("/testpost", (req, res) => {
  res.json({ message: "POST received" });
});



app.use(notFound);

app.use(errorHandler);

const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`Server is listening on port ${port}...`)
);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

let isShuttingDown = false;

async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Shutting down gracefully...");
  try {
    await new Promise((resolve) => server.close(resolve));
    console.log("HTTP server closed.");
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    console.log("Exiting process...");
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown(1);
});


module.exports = { app, server };
