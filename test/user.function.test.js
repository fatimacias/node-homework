require("dotenv").config();
const request = require("supertest");

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const prisma = require("../db/prisma");
let agent;
let saveRes;
let csrfToken;

const { app, server } = require("../app");

beforeAll(async () => {
  await prisma.Task.deleteMany();
  await prisma.User.deleteMany();

  agent = request.agent(app);
});

afterAll(async () => {
  await prisma.$disconnect();
  server.close();
});

describe("register a user", () => {
  it("46. it creates the user entry", async () => {
    const newUser = {
      name: "John Deere",
      email: "jdeere@example.com",
      password: "Pa$$word20",
      "recaptchaToken": "test-token"
    };

    saveRes = await agent.post("/api/users/register")
    .set("X-Recaptcha-Test", process.env.RECAPTCHA_BYPASS)
    .send(newUser);

    expect(saveRes.status).toBe(201);
  });
  it("47. Registration returns an object with the expected name.", () => {
    expect(saveRes.body.user.name).toBe("John Deere");
  });
  it("48. The returned object includes a csrfToken.", () => {
    expect(saveRes.body.csrfToken).toBeDefined();
  });
it("49. user can logon", async () => {
  saveRes = await agent
    .post("/api/users/logon")
    .send({ email: "jdeere@example.com", password: "Pa$$word20" });

  csrfToken = saveRes.body.csrfToken;
  expect(saveRes.status).toBe(200);
});

it("50. Verify that you are logged in: /api/tasks should not return 401", async () => {
  const res = await agent.get("/api/tasks");

  expect(res.status).not.toBe(401);
});


it("51. user can logoff", async () => {
  const res = await agent
    .post("/api/users/logoff")
    .set("X-CSRF-TOKEN", csrfToken);

  expect(res.status).toBe(200);
});

it("52. Verify that you are really logged out: /api/tasks should return 401", async () => {
  const res = await agent.get("/api/tasks");

  expect(res.status).toBe(401);
});

});
