const express = require("express");
const router = express.Router();

const { register, logon, logoff, show } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");
router.post("/register", register);
router.post("/logon", logon);
router.post("/logoff", jwtMiddleware ,logoff);
router.get("/:id", show);


module.exports = router;
