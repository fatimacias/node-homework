const { taskSchema, patchTaskSchema, taskFilterSchema } = require("../validation/taskSchema");
const { StatusCodes } = require("http-status-codes");

const prisma = require("../db/prisma");

const DEFAULT_TASK_SELECT = {
  id: true,
  title: true,
  isCompleted: true,
  priority: true,
  createdAt: true
};

const DEFAULT_USER_SELECT = {
  name: true,
  email: true
};

const TASK_WITH_USER_SELECT = {
  ...DEFAULT_TASK_SELECT,
  User: { select: DEFAULT_USER_SELECT }
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

  const task = await prisma.task.create({
    data: {title : value.title, isCompleted: value.isCompleted, userId:req.user.id, priority:value.priority},
    select : DEFAULT_TASK_SELECT
  });

  return res.status(StatusCodes.CREATED).json(task);
};


exports.index = async (req, res) => {

   const { error, value } = taskFilterSchema.validate(req.query, {
    abortEarly: false,
  });
  if (error) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: error.message });
  }
  const page = value.page;
  const limit = value.limit;
  const skip = (page - 1) * limit;

  const whereClause = {
    userId: req.user.id 
  }
  if(value.find){
    whereClause.title = {
      contains : value.find,
      mode: 'insensitive'
    }
  }
  if (value.isCompleted !== undefined) {
    whereClause.isCompleted = value.isCompleted;
  }
  if(value.priority){
    whereClause.priority = {
      equals : value.priority
    }
  }

if (value.min_date || value.max_date) {
  whereClause.createdAt = {
    ...(value.min_date && { gte: new Date(value.min_date) }),
    ...(value.max_date && { lte: new Date(value.max_date) }),
  };
}


  const tasks = await prisma.task.findMany(
    {where: whereClause,
    select: TASK_WITH_USER_SELECT,
    skip : skip,
    take : limit,
    orderBy : { createdAt : 'desc'}
  });

  const totalTask = await prisma.task.count({
    where: whereClause});
  
    if (totalTask === 0) 
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found" });
  const pagination = {
    page:page,
    limit : limit,
    total : totalTask,
    pages : Math.ceil(totalTask/limit),
    hasNext : page * limit < totalTask,
    hasPrev : page > 1
  };

  return res.json({tasks,pagination}) ;
};


exports.show = async (req, res,next) => {
  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "The task ID passed is not valid." });
  }

  try {
    const task = await prisma.task.findUnique({
    where:{id: taskId, userId: req.user.id},
    select: TASK_WITH_USER_SELECT,
  });

    if (!task) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found" });
    }

    return res.json(task);

  } catch (err) {
    if (err.code === "P2025" ) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "The task was not found."})
    } else {
      return next(err); 
    }
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

  const id = parseInt(req.params?.id);
  if (!id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  try {
    const task = await prisma.task.update({
      data: value,
      where: { id ,
          userId: req.user.id},
      select: TASK_WITH_USER_SELECT
  });
    if (!task) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found." });
    }

    return res.json(task);

  } catch (err) {
    if (err.code === "P2025" ) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "The task was not found."})
    } else {
      return next(err); 
    }
  }
};


exports.deleteTask = async (req, res,next) => {
  const id = parseInt(req.params?.id);
  if (!id) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "The task ID passed is not valid." });
  }

  try {
    const task = await prisma.task.delete({
      where: {id, userId: req.user.id},
      select: DEFAULT_TASK_SELECT
    })

    if (!task) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found." });
    }

    return res.json(task);

  } catch (err) {
    if (err.code === "P2025" ) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "The task was not found."})
    } else {
      return next(err); 
    }
  }
};

exports.bulkCreate = async (req, res, next) => {
  const {tasks}   = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ 
      error: "Invalid request data. Expected an array of tasks." 
    });
  }

  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority,
      userId: req.user.id
    });
  }

  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false
    });

    res.status(StatusCodes.CREATED).json({
      message: "success!",
      tasksCreated: result.count,
      totalRequested: validTasks.length
    });
  } catch (err) {
    return next(err);
  }
};

