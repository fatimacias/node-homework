const { StatusCodes } = require("http-status-codes");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require("../validation/userSchema");

const prisma = require("../db/prisma");

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

async function register(req, res,next) {

    if (!req.body) req.body = {};

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
                data: { email, name, hashedPassword },
                select: { id: true, email: true, name: true }
            });
            const welcomeTaskData = [
                { title: "Complete your profile", userId: newUser.id, priority: "medium" },
                { title: "Add your first task", userId: newUser.id, priority: "high" },
                { title: "Explore the app", userId: newUser.id, priority: "low" }
            ];
            await tx.task.createMany({ data: welcomeTaskData });

            const welcomeTasks = await tx.task.findMany({
                where: {
                    userId: newUser.id,
                    title: { in: welcomeTaskData.map(t => t.title) }
                },
                select: {
                    id: true,
                    title: true,
                    isCompleted: true,
                    userId: true,
                    priority: true
                }
            });
            return { user: newUser, welcomeTasks };
        });

        global.user_id =result.user.id;;
        return res.status(StatusCodes.CREATED).json({
            user: result.user,
            welcomeTasks : result.welcomeTasks,
            transactionStatus : "success"
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
    
    global.user_id = user.id;

    return res.status(StatusCodes.OK).json({
        name: user.name,
        email: user.email
    });
}

function logoff(req, res) {
    global.user_id = null;
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

module.exports = {
    register,
    logon,
    logoff,
    show,
};
