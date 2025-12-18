const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const { StatusCodes } = require("http-status-codes");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();
const sanitizeTask = (task) => {
  const { userId, ...sanitized } = task;
  return sanitized;
};

exports.create = (req, res) => {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: error.message });
  }

  const newTask = {
    ...value,
    id: taskCounter(),
    userId: global.user_id.email,
  };

  global.tasks.push(newTask);
  return res.status(StatusCodes.CREATED).json(sanitizeTask(newTask));
};


exports.index = (req, res) => {
  const userTasks = global.tasks
    .filter(task => task.userId === global.user_id.email)
    .map(sanitizeTask);

  if (userTasks.length === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found" });
  }

  return res.json(userTasks);
};


exports.show = (req, res) => {
  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "The task ID passed is not valid." });
  }

  const task = global.tasks.find(
    t => t.id === taskId && t.userId === global.user_id.email
  );

  if (!task) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
  }

  return res.json(sanitizeTask(task));
};


exports.update = (req, res) => {
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

  const task = global.tasks.find(
    t => t.id === taskId && t.userId === global.user_id.email
  );

  if (!task) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  Object.assign(task, value);
  return res.json(sanitizeTask(task));
};


exports.deleteTask = (req, res) => {
  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "The task ID passed is not valid." });
  }

  const index = global.tasks.findIndex(
    t => t.id === taskId && t.userId === global.user_id.email
  );

  if (index === -1) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
  }

  const deleted = sanitizeTask(global.tasks[index]);
  global.tasks.splice(index, 1);

  return res.json(deleted);
};

