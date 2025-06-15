import multer from 'multer';

// ตั้งค่า multer สำหรับอัปโหลดไฟล์
const storage = multer.memoryStorage();

// สร้าง multer instance สำหรับอัปโหลดรูปภาพ
export const uploadImage = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // จำกัดขนาดไฟล์ 2MB
  },
  fileFilter: (req, file, cb) => {
    // ตรวจสอบประเภทไฟล์
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('ไฟล์ที่อัปโหลดต้องเป็นรูปภาพเท่านั้น'), false);
    }
  }
}); 