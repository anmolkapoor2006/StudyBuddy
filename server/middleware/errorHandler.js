const Sentry = require("@sentry/node");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error to console in non-production or for unexpected 500s
  if (error.statusCode >= 500) {
    console.error("💥 Unhandled Error:", err);
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }
  }

  // Mongoose CastError (Bad ObjectId)
  if (err.name === "CastError") {
    error.message = `Resource not found with id: ${err.value}`;
    error.statusCode = 404;
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error.message = `Duplicate value entered for ${field}. Please use another value.`;
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    error.message = messages.join(". ");
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error.message = "Invalid authentication token. Please sign in again.";
    error.statusCode = 401;
  }
  if (err.name === "TokenExpiredError") {
    error.message = "Authentication token expired. Please sign in again.";
    error.statusCode = 401;
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
