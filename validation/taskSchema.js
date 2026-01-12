const { paginationSchema } = require("../validation/paginationSchema")
const Joi = require("joi");

const allowedPriority = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
};

const taskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).required(),
  isCompleted: Joi.boolean().default(false).not(null),
  priority : Joi.string().valid(allowedPriority.Low, allowedPriority.Medium, allowedPriority.High)
  .default(allowedPriority.Medium)
});

const patchTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).not(null),
  isCompleted: Joi.boolean().not(null),
  priority : Joi.string().valid(allowedPriority.Low, allowedPriority.Medium, allowedPriority.High)
}).min(1).message("No attributes to change were specified.");

const taskFilterSchema = Joi.object({
  find: Joi.string().trim().min(3).max(30),
  isCompleted: Joi.boolean(),
  priority : Joi.string().valid(allowedPriority.Low, allowedPriority.Medium, allowedPriority.High),
  min_date : Joi.date(),
  max_date : Joi.date(),
})
.custom((value, helpers) => {
  if (value.min_date && value.max_date && value.min_date > value.max_date) {
    return helpers.message("min_date must be earlier than max_date");
  }
  return value;
})
.concat(paginationSchema())
.options({convert: true, allowUnknown: false});

const searchQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(30).required(),
})
.concat(paginationSchema())
.options({convert: true, allowUnknown: false});

module.exports = { taskSchema, patchTaskSchema ,taskFilterSchema ,searchQuerySchema};