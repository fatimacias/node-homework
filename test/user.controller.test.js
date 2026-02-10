require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret";
process.env.GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "postmessage";
process.env.RECAPTCHA_BYPASS = process.env.RECAPTCHA_BYPASS || "test-recaptcha-bypass";

const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion.js");

const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const { register, logoff, logon, googleLogon, update } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const requireManager = require("../middleware/requireManager");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const EventEmitter = require("events");

let saveRes = null;
let saveData = null;
let jwtCookie = null;
let jwtReq = null;


jest.mock("google-auth-library", () => {
  const getToken = jest.fn(async () => ({ tokens: { id_token: "test-id-token" } }));
  const verifyIdToken = jest.fn(async () => ({
    getPayload: () => ({
      email: "guser@example.com",
      name: "Google User",
    }),
  }));

  const OAuth2Client = jest.fn().mockImplementation(() => ({
    getToken,
    verifyIdToken,
  }));

  return { OAuth2Client, __mocks: { getToken, verifyIdToken } };
});

function MockResponseWithCookies({ eventEmitter: EventEmitter }) {
  const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

  res.cookie = (name, value, options = {}) => {
    const serialized = cookie.serialize(name, String(value), options);
    let currentHeader = res.getHeader("Set-Cookie");

    if (currentHeader === undefined) {
      currentHeader = [];
    }

    currentHeader.push(serialized);
    res.setHeader("Set-Cookie", currentHeader);
  };

  return res;
}
beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("testing logon, register, and logoff", () => {
  it("33. A user can be registered.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        name: "Bob",
        email: "bob@sample.com",
        password: "Pa$$word20",
        recaptchaToken: "test-token"
      },
    });
    req.headers["X-Recaptcha-Test"] = process.env.RECAPTCHA_BYPASS;
    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(register, req, saveRes);

    expect(saveRes.statusCode).toBe(201);
  });
  it("34. The user can logon.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        email: "bob@sample.com",
        password: "Pa$$word20",
      },
    });

    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(logon, req, saveRes);

    expect(saveRes.statusCode).toBe(200);
  });
  it("35. A jwt cookie is set", () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find(str => str.startsWith("jwt="));
    expect(jwtCookie).toBeDefined();
  });
  it("36. The jwt cookie is HttpOnly", () => {
    expect(jwtCookie).toContain("HttpOnly");
  });
  it("37. Returned data has the expected name", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.name).toBe("Bob");
  });
  it("38. Returned data contains a csrfToken", () => {
    expect(saveData.csrfToken).toBeDefined();
  });
  it("39. You can now logoff.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });
    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(logoff, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("40. The logoff clears the cookie", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });

    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(logoff, req, saveRes);

    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find(str => str.startsWith("jwt="));

    expect(jwtCookie).toContain("Jan 1970");
  });
  it("41. Logon with bad password returns 401", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        email: "bob@sample.com",
        password: "WrongPassword123",
      },
    });

    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(logon, req, saveRes);

    expect(saveRes.statusCode).toBe(401);
  });
  it("42. Cannot register with an email that already exists", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        name: "Bob Duplicate",
        email: "bob@sample.com",
        password: "Pa$$word20",
      },
    });

    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(register, req, saveRes);

    expect(saveRes.statusCode).toBe(400);
  });

});

describe("Testing JWT middleware", () => {
  it("61. Returns a 401 if the JWT cookie is not present", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });

    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);

    expect(saveRes.statusCode).toBe(401);
  });
  it("62. Returns a 401 if the JWT is invalid", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });

    const badJwt = jwt.sign(
      { id: 5, csrfToken: "badToken" },
      "badSecret",
      { expiresIn: "1h" }
    );

    req.cookies = { jwt: badJwt };

    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);

    expect(saveRes.statusCode).toBe(401);
  });
  it("63. Returns a 401 if the CSRF token is invalid", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });

    const goodJwt = jwt.sign(
      { id: 5, csrfToken: "badToken" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    req.cookies = { jwt: goodJwt };

    if (!req.headers) {
      req.headers = {};
    }

    req.headers["X-CSRF-TOKEN"] = "goodToken";

    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);

    expect(saveRes.statusCode).toBe(401);
  });
  it("64. Calls next() if the JWT and CSRF token are valid", async () => {
    jwtReq = httpMocks.createRequest({
      method: "POST",
    });

    const goodJwt = jwt.sign(
      { id: 5, csrfToken: "goodToken" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    jwtReq.cookies = { jwt: goodJwt };

    if (!jwtReq.headers) {
      jwtReq.headers = {};
    }

    jwtReq.headers["X-CSRF-TOKEN"] = "goodToken";

    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });

    const next = await waitForRouteHandlerCompletion(jwtMiddleware, jwtReq, saveRes);

    expect(next).toHaveBeenCalled();
  });
  it("65. Sets req.user.id when JWT is valid", () => {
    expect(jwtReq.user.id).toBe(5);
  });

  it("66. Sets req.user.roles when JWT contains roles array", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    const token = jwt.sign(
      { id: 5, csrfToken: "t", roles: ["manager", "other"] },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    req.cookies = { jwt: token };
    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });
    const next = await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(next).toHaveBeenCalled();
    expect(req.user.roles).toEqual(["manager", "other"]);
  });

  it("67. Sets req.user.roles when JWT contains comma-delimited roles string", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    const token = jwt.sign(
      { id: 5, csrfToken: "t", roles: "manager, other" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    req.cookies = { jwt: token };
    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });
    const next = await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(next).toHaveBeenCalled();
    expect(req.user.roles).toEqual(["manager", "other"]);
  });
});

describe("User can register and logon with Google", () => {
  it("68. User can register/logon with Google", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { authorizationCode: "test-code" },
    });

    saveRes = MockResponseWithCookies({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(
      googleLogon,
      req,
      saveRes
    );

    expect(saveRes.statusCode).toBe(200);
  });
  it("69. Returned data has the expected name and email", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.name).toBe("Google User");
    expect(saveData.email).toBe("guser@example.com"); 
  });
});

describe("RBAC: requireManager", () => {
  it("denies when roles are missing", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: 1 };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(requireManager, req, res);
    expect(res.statusCode).toBe(401);
  });

  it("denies when user is not a manager", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: 1, roles: ["user"] };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(requireManager, req, res);
    expect(res.statusCode).toBe(401);
  });

  it("allows when user has manager role", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: 1, roles: ["manager"] };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    const next = await waitForRouteHandlerCompletion(requireManager, req, res);
    expect(next).toHaveBeenCalled();
  });
});

describe("User update RBAC", () => {
  let user1;
  let user2;
  let manager;

  beforeAll(async () => {
    user1 = await prisma.user.create({
      data: { name: "User 1", email: "u1@example.com", hashedPassword: "nonsense", roles: "user" },
      select: { id: true },
    });
    user2 = await prisma.user.create({
      data: { name: "User 2", email: "u2@example.com", hashedPassword: "nonsense", roles: "user" },
      select: { id: true },
    });
    manager = await prisma.user.create({
      data: { name: "Manager", email: "m1@example.com", hashedPassword: "nonsense", roles: "manager" },
      select: { id: true },
    });
  });

  it("401 when non-manager updates another user", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      params: { id: String(user2.id) },
      body: { name: "New Name" },
    });
    req.user = { id: user1.id, roles: ["user"] };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(update, req, res);
    expect(res.statusCode).toBe(401);
  });

  it("401 when non-manager tries to update roles", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      params: { id: String(user1.id) },
      body: { roles: "manager" },
    });
    req.user = { id: user1.id, roles: ["user"] };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(update, req, res);
    expect(res.statusCode).toBe(401);
  });

  it("200 when user updates own name", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      params: { id: String(user1.id) },
      body: { name: "Updated Name" },
    });
    req.user = { id: user1.id, roles: ["user"] };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(update, req, res);
    expect(res.statusCode).toBe(200);
  });

  it("200 when manager updates roles (normalized)", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      params: { id: String(user2.id) },
      body: { roles: "User, MANAGER  " },
    });
    req.user = { id: manager.id, roles: ["manager"] };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(update, req, res);
    expect(res.statusCode).toBe(200);

    const updated = await prisma.user.findUnique({
      where: { id: user2.id },
      select: { roles: true },
    });
    expect(updated.roles).toBe("user,manager");
  });
});
