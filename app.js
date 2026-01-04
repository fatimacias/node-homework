const express = require("express");
const errorHandler = require("./middleware/error-handler");
const notFound = require("./middleware/not-found");
const authMiddleware = require("./middleware/auth");
const taskRoutes = require("./routers/taskRoutes");
const userRoutes = require("./routers/userRoutes");
const prisma = require("./db/prisma");

const app = express();
app.use(express.json({ limit: "1kb" }));

global.user_id = null;
global.users = [];
global.tasks = [];

app.use("/api/tasks", authMiddleware, taskRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ message: `db not connected, error: ${ err.message }` });
  }
});

app.use(errorHandler);

app.use((req, res, next) => {
  console.log("LOG:", req.method, req.path, req.query);
  next();
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
  await prisma.$disconnect();
  console.log("Prisma disconnected");
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
