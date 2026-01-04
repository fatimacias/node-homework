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
    let user = null ; 
    try
    {
        user = await prisma.user.create({
            data: {name : value.name, email: value.email, hashedPassword},
            select: { name:true, email: true, id:true}
        });
       
        global.user_id = user.id;
        return res.status(StatusCodes.CREATED).json({
            name : user.name,
            email : user.email,
        });
    }
    catch(err)
    {
        if(err.name === "PrismaClientKnownRequestError" && err.code == "P2002"){
            return res.status(StatusCodes.BAD_REQUEST).json({message:"User already exists"});
        }
        return next(err);
    }
    
}

async function logon(req, res,next) {
    if (!req.body) req.body = {};
    const  password = req.body.password;
    let email = req.body.email.toLowerCase();
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



module.exports = {
    register,
    logon,
    logoff
};
