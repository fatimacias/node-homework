const { StatusCodes } = require("http-status-codes");

const errorHandlerMiddleware = (err, req, res, next) => {

    if (err.name === "PrismaClientInitializationError") {
        console.error("Couldn't connect to the database. Is It running?")
    }

    if (err.code === "ECONNREFUSED" && err.port === 5432) {
        console.log(
            "Database connection was refused. Is PostgreSQL running?"
        );
    }

    console.error(
        "Internal server error:",
        err.constructor.name,
        JSON.stringify(err, ["name", "message", "stack"])
    );

    if (!res.headersSent) 
    {
        return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send("An internal server error occurred.");
    }
};

module.exports = errorHandlerMiddleware;
