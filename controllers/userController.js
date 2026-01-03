const { StatusCodes } = require("http-status-codes");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require("../validation/userSchema");

const pool = require("../db/pg-pool");

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
  
    try
    {
        console.log(value);
        const result = await pool.query(
        `INSERT INTO users (email, name, hashed_password)
        VALUES ($1, $2, $3) RETURNING id, email, name`,
        [value.email, value.name, hashedPassword]
        );

        const newUser = result.rows[0];

        global.user_id = newUser.id;
        return res.status(StatusCodes.CREATED).json({
            name : newUser.name,
            email : newUser.email,
        });
    }
    catch(err)
    {
        if(err.code =="23505"){
            return res.status(StatusCodes.BAD_REQUEST).json({message:"User already exists"});
        }
        return next(err);
    }
    
}

async function logon(req, res,next) {
    if (!req.body) req.body = {};
    const { email, password } = req.body;

    let result;
    try {
        result = await pool.query("SELECT * FROM users WHERE email = $1",[email]);
    } catch (err) {
        return next(err); 
    }
    
    if (result.rows.length == 0) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "Authentication Failed"
        });
    }

    const user = result.rows[0];

    const isValid = await comparePassword(password, user.hashed_password);
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
