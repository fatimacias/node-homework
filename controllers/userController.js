const { StatusCodes } = require("http-status-codes");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require("../validation/userSchema");

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

async function register(req, res) {

    if (!req.body) req.body = {};

    const { error, value } = userSchema.validate(req.body, {
        abortEarly: false,
    });

    if (error) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: error.message });
    }

    const { name, email, password } = value;
    const hashedPassword = await hashPassword(password);
    const newUser = {
        name,
        email,
        hashedPassword,
    };

    global.users.push(newUser);
    global.user_id = newUser;

    const responseUser = { ...newUser };
    delete responseUser.password;

    return res.status(StatusCodes.CREATED).json({
        name,
        email,
    });
}

async function logon(req, res) {
    if (!req.body) req.body = {};
    const { email, password } = req.body;

    const found = global.users.find(u => u.email === email);

    if (!found) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "Authentication Failed"
        });
    }

    const isValid = await comparePassword(password, found.hashedPassword);
    if (!isValid) {
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ message: "Authentication Failed" });
    }
    
    global.user_id = found;

    return res.status(StatusCodes.OK).json({
        name: found.name,
        email: found.email
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
