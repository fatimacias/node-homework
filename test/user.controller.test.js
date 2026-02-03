require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");

const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const { register, logoff, logon } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const EventEmitter = require("events");

let saveRes = null;
let saveData = null;
let jwtCookie = null;
let jwtReq = null;


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
  await prisma.Task.deleteMany();
  await prisma.User.deleteMany();
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
      },
    });

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
    console.log(saveRes);
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
});
