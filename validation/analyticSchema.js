const { paginationSchema } = require("../validation/paginationSchema")
const Joi = require("joi");

const searchQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(30).messages({
    "string.min": "Search query must be at least 2 characters long",
  }),
})
.concat(paginationSchema({defaultLimit: 20}))
.options({convert: true, allowUnknown: false});

const usersWithStatSchema = Joi.object({

})
.concat(paginationSchema())
.options({convert: true, allowUnknown: false});

module.exports = { searchQuerySchema,usersWithStatSchema};