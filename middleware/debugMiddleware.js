import debug from 'debug';

// สร้าง debug middleware function เดียวที่รับ module name เป็น parameter
export const createDebugMiddleware = (moduleName) => {
  const debugInstance = debug(`app:${moduleName}`);
  
  return (req, res, next) => {
    debugInstance(`${req.method} ${req.originalUrl} - Body:`, req.body);
    next();
  };
};

// สร้าง middleware instances สำหรับแต่ละ module
export const authDebugMiddleware = createDebugMiddleware('auth');
export const userDebugMiddleware = createDebugMiddleware('user');
export const postDebugMiddleware = createDebugMiddleware('post'); 