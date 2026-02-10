const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

const send401 = (res) => {
  res
    .status(StatusCodes.UNAUTHORIZED)
    .json({ message: "No user is authenticated." });
};

module.exports = async (req, res, next) => {
  const token = req?.cookies?.jwt;
  if (!token) {
    return send401(res);
  } 
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return send401(res);
    }
    const roles = Array.isArray(decoded.roles)
      ? decoded.roles.map((r) => String(r).trim().toLowerCase()).filter(Boolean)
      : (typeof decoded.roles === "string"
        ? decoded.roles.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean)
        : undefined);
    req.user = { id: decoded.id, roles }; 
    if ( ["POST", "PATCH", "PUT", "DELETE", "CONNECT"].includes(req.method)) {
      if (req.get("X-CSRF-TOKEN") != decoded.csrfToken) {
        return send401(res);
      }
    }
    next();
  });
};
