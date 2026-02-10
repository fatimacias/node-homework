const express = require("express");
const router = express.Router();

const { register, logon, googleLogon, logoff, show, update } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

/**
 * @openapi
 * /api/users/register:
 *   post:
 *     summary: Register a new user (local)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegisterRequest'
 *     responses:
 *       '201':
 *         description: Created (sets jwt cookie)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       '400':
 *         description: Validation error (or email already registered)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationErrorResponse'
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/users/logon:
 *   post:
 *     summary: Log on with email/password (local)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogonRequest'
 *     responses:
 *       '200':
 *         description: OK (sets jwt cookie)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '401':
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/users/googleLogon:
 *   post:
 *     summary: Log on with Google OAuth authorization code
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleLogonRequest'
 *     responses:
 *       '200':
 *         description: OK (sets jwt cookie)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       '401':
 *         description: Google authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Google OAuth not configured on server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/users/logoff:
 *   post:
 *     summary: Log off (clears jwt cookie)
 *     tags: [Users]
 *     security:
 *       - jwtCookie: []
 *     parameters:
 *       - $ref: '#/components/parameters/CsrfToken'
 *     responses:
 *       '200':
 *         description: OK
 *       '401':
 *         description: Not authenticated / CSRF invalid
 *
 * /api/users/{id}:
 *   get:
 *     summary: Get user profile + latest incomplete tasks
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserShowResponse'
 *       '400':
 *         description: Invalid user id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Update a user (name; roles manager-only)
 *     tags: [Users]
 *     security:
 *       - jwtCookie: []
 *     parameters:
 *       - $ref: '#/components/parameters/CsrfToken'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 3, maxLength: 30 }
 *               roles:
 *                 type: string
 *                 example: "user,manager"
 *                 description: Comma-delimited roles. Only a manager can set this.
 *             minProperties: 1
 *     responses:
 *       '200':
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserPublic'
 *       '400':
 *         description: Validation error / invalid id
 *       '401':
 *         description: Not authenticated / CSRF invalid / not allowed
 */

router.post("/register", register);
router.post("/logon", logon);
router.post("/googleLogon", googleLogon);
router.post("/logoff", jwtMiddleware ,logoff);
router.get("/:id", show);
router.patch("/:id", jwtMiddleware, update);


module.exports = router;
