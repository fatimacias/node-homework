const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     summary: Create a task
 *     tags: [Tasks]
 *     security:
 *       - jwtCookie: []
 *     parameters:
 *       - $ref: '#/components/parameters/CsrfToken'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskCreateRequest'
 *     responses:
 *       '201':
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Not authenticated / CSRF invalid
 *   get:
 *     summary: List tasks (with filters + pagination)
 *     tags: [Tasks]
 *     security:
 *       - jwtCookie: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: find
 *         schema: { type: string, minLength: 3, maxLength: 30 }
 *         description: Case-insensitive title substring
 *       - in: query
 *         name: isCompleted
 *         schema: { type: boolean }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: min_date
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: max_date
 *         schema: { type: string, format: date-time }
 *     responses:
 *       '200':
 *         description: List of tasks and pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TasksIndexResponse'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Not authenticated
 *       '404':
 *         description: No tasks found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/tasks/bulk:
 *   post:
 *     summary: Bulk create tasks
 *     tags: [Tasks]
 *     security:
 *       - jwtCookie: []
 *     parameters:
 *       - $ref: '#/components/parameters/CsrfToken'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskBulkCreateRequest'
 *     responses:
 *       '201':
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskBulkCreateResponse'
 *       '400':
 *         description: Validation error
 *       '401':
 *         description: Not authenticated / CSRF invalid
 *
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a task by id
 *     tags: [Tasks]
 *     security:
 *       - jwtCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Task found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskWithUser'
 *       '400':
 *         description: Invalid id
 *       '401':
 *         description: Not authenticated
 *       '404':
 *         description: Not found
 *   patch:
 *     summary: Update a task (partial)
 *     tags: [Tasks]
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
 *             $ref: '#/components/schemas/TaskPatchRequest'
 *     responses:
 *       '200':
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskWithUser'
 *       '400':
 *         description: Validation error / invalid id
 *       '401':
 *         description: Not authenticated / CSRF invalid
 *       '404':
 *         description: Not found
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - jwtCookie: []
 *     parameters:
 *       - $ref: '#/components/parameters/CsrfToken'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       '400':
 *         description: Invalid id
 *       '401':
 *         description: Not authenticated / CSRF invalid
 *       '404':
 *         description: Not found
 */

router.post("/", taskController.create);
router.get("/", taskController.index);
router.post("/bulk",taskController.bulkCreate);
router.get("/:id", taskController.show);
router.patch("/:id", taskController.update);
router.delete("/:id", taskController.deleteTask);

module.exports = router;
