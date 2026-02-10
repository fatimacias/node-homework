const express = require("express");
const router = express.Router();

const { getUserAnalytics, getUsersWithStats ,searchTasks} = require("../controllers/analyticsController");
const requireManager = require("../middleware/requireManager");

router.use(requireManager);

/**
 * @openapi
 * /api/analytics/users/{id}:
 *   get:
 *     summary: Get analytics for a single user
 *     tags: [Analytics]
 *     security:
 *       - jwtCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsUserResponse'
 *       '400':
 *         description: Invalid user id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Not authenticated
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/analytics/users:
 *   get:
 *     summary: List users with task stats (paginated)
 *     tags: [Analytics]
 *     security:
 *       - jwtCookie: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsUsersWithStatsResponse'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Not authenticated
 *
 * /api/analytics/tasks/search:
 *   get:
 *     summary: Search tasks by title or user name
 *     tags: [Analytics]
 *     security:
 *       - jwtCookie: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2, maxLength: 30 }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Accepted but not used by the current implementation
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsTaskSearchResponse'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Not authenticated
 */

router.get("/users/:id",getUserAnalytics);
router.get("/users",getUsersWithStats);
router.get("/tasks/search",searchTasks);

module.exports = router;
