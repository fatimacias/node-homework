const express = require("express");
const router = express.Router();

const { register, logon, logoff } = require("../controllers/userController");

router.post("/register", register);
router.post("/logon", logon);
router.post("/logoff", logoff);

module.exports = router;
