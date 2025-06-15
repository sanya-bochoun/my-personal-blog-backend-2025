import { body, validationResult, param, query } from 'express-validator';

/**
 * ฟังก์ชันที่ใช้สำหรับตรวจสอบผลลัพธ์การ validate
 * และส่งข้อความผิดพลาดกลับไปยังผู้ใช้
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      status: 'error',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * กฎสำหรับตรวจสอบการลงทะเบียน
 */
const registerRules = [
  body('username')
    .trim()
    .notEmpty().withMessage('กรุณาระบุชื่อผู้ใช้')
    .isLength({ min: 3, max: 30 }).withMessage('ชื่อผู้ใช้ต้องมีความยาว 3-30 ตัวอักษร')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร ตัวเลข หรือ _ เท่านั้น'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('กรุณาระบุอีเมล')
    .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('กรุณาระบุรหัสผ่าน')
    .isLength({ min: 8 }).withMessage('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('รหัสผ่านต้องประกอบด้วยตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลขอย่างน้อย 1 ตัว'),
  
  body('full_name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('ชื่อต้องมีความยาวไม่เกิน 100 ตัวอักษร'),
];

/**
 * กฎสำหรับตรวจสอบการเข้าสู่ระบบ
 */
const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('กรุณาระบุอีเมล')
    .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
  
  body('password')
    .notEmpty().withMessage('กรุณาระบุรหัสผ่าน')
];

/**
 * กฎสำหรับตรวจสอบการอัปเดตโปรไฟล์
 */
const updateProfileRules = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('ชื่อต้องมีความยาวไม่เกิน 100 ตัวอักษร'),
  
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('ชื่อผู้ใช้ต้องมีความยาว 3-30 ตัวอักษร')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร ตัวเลข หรือ _ เท่านั้น'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('ประวัติต้องมีความยาวไม่เกิน 500 ตัวอักษร'),
  
  body('avatar_url')
    .optional()
    .trim()
    .isURL().withMessage('URL รูปโปรไฟล์ไม่ถูกต้อง')
];

/**
 * กฎสำหรับตรวจสอบการเปลี่ยนรหัสผ่าน
 */
const changePasswordRules = [
  body('current_password')
    .notEmpty().withMessage('กรุณาระบุรหัสผ่านปัจจุบัน'),
  
  body('new_password')
    .notEmpty().withMessage('กรุณาระบุรหัสผ่านใหม่')
    .isLength({ min: 8 }).withMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('รหัสผ่านใหม่ต้องประกอบด้วยตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลขอย่างน้อย 1 ตัว')
];

/**
 * กฎสำหรับตรวจสอบการรีเฟรช token
 */
const refreshTokenRules = [
  body('refreshToken')
    .notEmpty().withMessage('กรุณาระบุ refresh token')
];

export {
  validate,
  registerRules,
  loginRules,
  updateProfileRules,
  changePasswordRules,
  refreshTokenRules
}; 