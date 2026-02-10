const { StatusCodes } = require("http-status-codes");

module.exports = (req, res, next) => {
  const roles = req?.user?.roles;
  if (!roles || !Array.isArray(roles) || !roles.includes("manager")) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });
  }
  next();
};

