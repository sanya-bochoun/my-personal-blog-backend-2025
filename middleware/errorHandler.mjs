/**
 * Function for catching errors in async functions
 * @param {Function} fn - Async function to catch errors from
 * @returns {Function} - middleware function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class for application
 * @example
 * throw new AppError('User not found', 404);
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export { catchAsync, AppError };

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  // Handle errors by type
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: err.message,
      errors: err.errors
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized access'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'System error occurred. Please try again.' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}; 