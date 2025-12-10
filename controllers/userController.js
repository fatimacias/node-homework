const { StatusCodes } = require("http-status-codes");

function register(req, res) {
    const newUser = { ...req.body };

    global.users.push(newUser);
    global.user_id = newUser;

    const responseUser = { ...newUser };
    delete responseUser.password;

    return res.status(StatusCodes.CREATED).json(newUser);
}

function logon(req, res) {
    const { email, password } = req.body;

    const found = global.users.find(u => u.email === email);
     if (!found || found.password !== password) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "Authentication Failed"
        });
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
