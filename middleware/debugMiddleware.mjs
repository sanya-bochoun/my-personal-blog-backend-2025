import debug from 'debug';

// Create a single debug middleware function that takes module name as parameter
export const createDebugMiddleware = (moduleName) => {
  const debugInstance = debug(`app:${moduleName}`);
  
  return (req, res, next) => {
    debugInstance(`${req.method} ${req.originalUrl} - Body:`, req.body);
    next();
  };
};

// Create middleware instances for each module
export const authDebugMiddleware = createDebugMiddleware('auth');
export const userDebugMiddleware = createDebugMiddleware('user');
export const postDebugMiddleware = createDebugMiddleware('post'); 