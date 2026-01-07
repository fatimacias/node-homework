const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const { StatusCodes } = require("http-status-codes");

const prisma = require("../db/prisma");

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
    data: {title : value.title, isCompleted: value.isCompleted, userId:global.user_id},
    select : {id:true,title:true,isCompleted:true, createdAt: true}
  });

  return res.status(StatusCodes.CREATED).json(task);
};


exports.index = async (req, res) => {

  const tasks = await prisma.task.findMany(
    {where:{userId:global.user_id},
    select: {title:true, isCompleted:true, id: true}
  });
  if (!tasks || tasks.length==0) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found" });
  }
  return res.json(tasks);
};


exports.show = async (req, res,next) => {
  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "The task ID passed is not valid." });
  }

  try {
   const task = await prisma.task.findUnique({
    where:{id: taskId, userId: global.user_id},
    select : {id:true,title:true,isCompleted:true, createdAt: true}
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
          userId: global.user_id},
      select: { title: true, isCompleted: true, id: true }
  });
  console.log(task);
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


exports.deleteTask = async (req, res,next) => {
  const id = parseInt(req.params?.id);
  if (!id) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "The task ID passed is not valid." });
  }

  try {
    const task = await prisma.task.delete({
      where: {id, userId: global.user_id},
      select: { title: true, isCompleted: true, id: true }
    })

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

