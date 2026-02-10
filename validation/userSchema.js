const Joi = require("joi");

const userSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  name: Joi.string().trim().min(3).max(30).required(),
  password: Joi.string()
    .trim()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must be at least 8 characters long and include upper and lower case letters, a number, and a special character.",
    }),
  recaptchaToken: Joi.string().required(),
});

const googleLogonSchema = Joi.object({
  authorizationCode: Joi.string().trim().required(),
});

const userUpdateSchema = Joi.object({
  name: Joi.string().trim().min(3).max(30),
  roles: Joi.string().trim().min(1).max(255),
})
  .min(1)
  .message("No attributes to change were specified.");

module.exports = { userSchema,googleLogonSchema, userUpdateSchema };