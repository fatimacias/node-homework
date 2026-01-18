const Joi = require("joi");

const paginationSchema = ({ defaultLimit = 10 } = {}) =>
  Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(defaultLimit),
  });
module.exports = {
    paginationSchema
};
