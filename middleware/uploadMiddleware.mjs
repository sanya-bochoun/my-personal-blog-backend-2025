import multer from 'multer';

// Configure multer for file uploads
const storage = multer.memoryStorage();

// Create multer instance for image uploads
export const uploadImage = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // Limit file size to 2MB
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
}); 