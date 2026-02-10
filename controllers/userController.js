const { StatusCodes } = require("http-status-codes");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const util = require("util");
const { OAuth2Client } = require("google-auth-library");
const scrypt = util.promisify(crypto.scrypt);
const { userSchema, googleLogonSchema, userUpdateSchema } = require("../validation/userSchema");

const prisma = require("../db/prisma");

const welcomeTaskTemplates = [
    { title: "Complete your profile", priority: "medium" },
    { title: "Add your first task", priority: "high" },
    { title: "Explore the app", priority: "low" },
];

const parseRoles = (roles) => {
    if (!roles) return [];
    if (Array.isArray(roles)) return roles.map((r) => String(r).trim().toLowerCase()).filter(Boolean);
    return String(roles)
        .split(",")
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean);
};

const normalizeRolesString = (roles) => {
    const parsed = parseRoles(roles);
    if (!parsed.length) return null;
    return parsed.join(",");
};

const buildWelcomeTaskData = (userId) => {
    return welcomeTaskTemplates.map((t) => ({ ...t, userId }));
};

const createWelcomeTasksForUser = async (tx, userId) => {
    const welcomeTaskData = buildWelcomeTaskData(userId);
    await tx.task.createMany({ data: welcomeTaskData });
    return await tx.task.findMany({
        where: {
            userId,
            title: { in: welcomeTaskData.map((t) => t.title) }
        },
        select: {
            id: true,
            title: true,
            isCompleted: true,
            userId: true,
            priority: true
        }
    });
};

const cookieFlags = (req) => {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
    };
};

const setJwtCookie = (req, res, user) => {
    const payload = { id: user.id, csrfToken:crypto.randomUUID() };
    const roles = parseRoles(user?.roles);
    if (roles.length) payload.roles = roles;
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); 
    res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 });
    return payload.csrfToken;
};

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = await scrypt(password, salt, 64);
    return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
    const [salt, key] = storedHash.split(":");
    const derivedKey = await scrypt(inputPassword, salt, 64);
    return crypto.timingSafeEqual(
    Buffer.from(key, "hex"),
    derivedKey
    );
}
async function validateRecaptcha(req, res) {
    let isPerson = false;
    if(process.env.RECAPTCHA_BYPASS && req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS)
    {
        isPerson = true;
    }
    else if(req.body.recaptchaToken)
    {
        const token = req.body.recaptchaToken;
        const recaptchaResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                secret: process.env.RECAPTCHA_SECRET,
                response: token,
                remoteip: req.ip
            })
        });
        const recaptchaData = await recaptchaResponse.json();
        isPerson = recaptchaData.success;
        delete req.body.recaptchaToken;
    }

    if(!isPerson)
    {
        res.status(StatusCodes.BAD_REQUEST).json({error: "We can't tell if you're a person or a bot."});
        return false;
    }
    return true;
}
async function register(req, res,next) {

    if (!req.body) req.body = {};
    const isPerson = await validateRecaptcha(req, res);
    if (!isPerson) return;
    const { error, value } = userSchema.validate(req.body, {
        abortEarly: false,
    });

    if (error) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: "Validation failed" , details: error.details });
    }

    const hashedPassword = await hashPassword(value.password);
    delete value.password;
    const email = value.email.toLowerCase();
    const name = value.name;
    try
    {
        const result = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: { email, name, hashedPassword, authProvider: "local", roles: "user" },
                select: { id: true, email: true, name: true, roles: true }
            });
            const welcomeTasks = await createWelcomeTasksForUser(tx, newUser.id);
            return { user: newUser, welcomeTasks };
        });

        const csrfToken = setJwtCookie(req, res, result.user);

        return res.status(StatusCodes.CREATED).json({
            user: result.user,
            welcomeTasks : result.welcomeTasks,
            transactionStatus : "success",
            csrfToken
        });
    }
    catch(err)
    {
        if(err.name === "PrismaClientKnownRequestError" && err.code == "P2002"){
            return res.status(StatusCodes.BAD_REQUEST).json({error: "Email already registered"});
        }
        return next(err);
    }
    
}

async function logon(req, res,next) {
    if (!req.body) req.body = {};
    const  password = req.body.password;
    const email = req.body.email.toLowerCase();
    let user;
    try {
        user = await prisma.user.findUnique({where : {email}});
    } catch (err) {
        return next(err); 
    }
    if (!user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "Authentication Failed"
        });
    }   
    const isValid = await comparePassword(password, user.hashedPassword);
    
    if (!isValid) {
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ message: "Authentication Failed" });
    }
    
    const csrfToken = setJwtCookie(req, res, user);

    return res.status(StatusCodes.OK).json({
        name: user.name,
        email: user.email,
        csrfToken
    });
}

async function googleLogon(req, res, next) {
    if (!req.body) req.body = {};
    const { error, value } = googleLogonSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: "Validation failed", details: error.details });
    }
    const authorizationCode = value.authorizationCode;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI || "").trim() || "postmessage";

    if (!clientId || !clientSecret) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Google OAuth is not configured on the server"
        });
    }
    try {
        const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
        const { tokens } = await oauth2Client.getToken({
            code: authorizationCode,
            redirect_uri: redirectUri,
        });
        if (!tokens?.id_token) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Google authentication failed" });
        }

        const ticket = await oauth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: clientId,
        });

        const payload = ticket.getPayload();
        const email = payload?.email?.toLowerCase();
        if (!email) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Google authentication failed" });
        }

        const nameFromGoogle = payload?.name || payload?.given_name || "Google User";
        const name = String(nameFromGoogle).slice(0, 30);

        let user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, roles: true },
        });

        if (!user) {
            const bogusPassword = crypto.randomBytes(32).toString("hex");
            const hashedPassword = await hashPassword(bogusPassword);
            try {
                user = await prisma.$transaction(async (tx) => {
                    const newUser = await tx.user.create({
                        data: { email, name, hashedPassword, authProvider: "google", roles: "user" },
                        select: { id: true, email: true, name: true, roles: true },
                    });
                    await createWelcomeTasksForUser(tx, newUser.id);
                    return newUser;
                });
            } catch (createErr) {
                if (createErr?.name === "PrismaClientKnownRequestError" && createErr.code == "P2002") {
                    user = await prisma.user.findUnique({
                        where: { email },
                        select: { id: true, email: true, name: true, roles: true },
                    });
                } else {
                    throw createErr;
                }
            }
        }

        const csrfToken = setJwtCookie(req, res, user);
        return res.status(StatusCodes.OK).json({
            name: user.name,
            email: user.email,
            csrfToken,
        });
    } catch (err) {
        if (err?.response?.data?.error || err?.message?.toLowerCase?.().includes("invalid_grant")) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Google authentication failed" });
        }
        return next(err);
    }
}

function logoff(req, res) {
    res.clearCookie("jwt", cookieFlags(req));
    return res.sendStatus(StatusCodes.OK);
}

async function show (req, res) {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid user ID" });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            roles: true,
            createdAt: true,
            Task: {
                where: { isCompleted: false },
                select: { 
                    id: true, 
                    title: true, 
                    priority: true,
                    createdAt: true 
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            }
        }
    });

    if (!user) 
        return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });

    res.status(StatusCodes.OK).json(user);
};

async function update(req, res, next) {
    if (!req.body) req.body = {};
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid user ID" });
    }
    const { error, value } = userUpdateSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: "Validation failed", details: error.details });
    }

    const requesterId = req?.user?.id;
    const requesterRoles = req?.user?.roles || [];
    const isManager = Array.isArray(requesterRoles) && requesterRoles.includes("manager");
    const isSelf = requesterId === userId;

    if (!isSelf && !isManager) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    const data = {};
    if (value.name !== undefined) data.name = value.name;

    if (value.roles !== undefined) {
        if (!isManager) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });
        }
        const normalized = normalizeRolesString(value.roles);
        if (!normalized) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Validation failed" });
        }
        data.roles = normalized;
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                roles: true,
                authProvider: true,
                createdAt: true,
            }
        });
        return res.status(StatusCodes.OK).json({ user: updatedUser });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    register,
    logon,
    googleLogon,
    logoff,
    show,
    update,
};
