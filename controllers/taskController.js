const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const { StatusCodes } = require("http-status-codes");

const pool = require("../db/pg-pool");

const sanitizeTask = (task) => {
  const { userId, ...sanitized } = task;
  return sanitized;
};

exports.create = async (req, res) => {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: error.message });
  }
  console.log(global.user_id)
  const task  = await pool.query(`INSERT INTO tasks (title, is_completed, user_id) 
  VALUES ( $1, $2, $3 ) RETURNING id, title, is_completed`,
  [value.title, value.isCompleted, global.user_id]);

  return res.status(StatusCodes.CREATED).json(sanitizeTask(task.rows[0]));
};


exports.index = async (req, res) => {

  const tasks = await pool.query("SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
  [global.user_id]
  )
  if (tasks.rows.length === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found" });
  }
  return res.json(tasks.rows.map(sanitizeTask));
};


exports.show = async (req, res,next) => {
  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "The task ID passed is not valid." });
  }

  try {
    const result = await pool.query(
      `SELECT id, title, is_completed
        FROM tasks
        WHERE id = $1 AND user_id = $2`,
      [taskId, global.user_id]
    );

    if (result.rows.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found" });
    }

    return res.json(sanitizeTask(result.rows[0]));

  } catch (err) {
    return next(err);
  }
};


exports.update = async  (req, res,next) => {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: error.message });
  }

  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  const keys = Object.keys(value);
  if (keys.length === 0) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "No fields to update." });
  }
const columnMap = {
    title: "title",
    isCompleted: "is_completed",
  };

 const setClauses = keys
    .map((key, i) => `${columnMap[key]} = $${i + 1}`)
    .join(", ");

  const idParam = `$${keys.length + 1}`;
  const userParam = `$${keys.length + 2}`;

  try {
    const result = await pool.query(
      `UPDATE tasks
        SET ${setClauses}
        WHERE id = ${idParam} AND user_id = ${userParam}
        RETURNING id, title, is_completed`,
      [...Object.values(value), taskId, global.user_id]
    );

    if (result.rows.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found" });
    }

    return res.json(result.rows[0]);

  } catch (err) {
    return next(err);
  }
};


exports.deleteTask = async (req, res,next) => {
  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "The task ID passed is not valid." });
  }

  try {
    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, is_completed`,
      [taskId, global.user_id]
    );

    if (result.rows.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found" });
    }

    return res.json(result.rows[0]);

  } catch (err) {
    return next(err);
  }
};

