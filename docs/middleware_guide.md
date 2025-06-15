# คู่มือการใช้งาน Middleware ในระบบ

เอกสารนี้อธิบายรายละเอียดของ middleware แต่ละตัวที่ใช้ในระบบ backend ของโปรเจค My Personal Blog

## สารบัญ

1. [Helmet](#helmet)
2. [Rate Limiting](#rate-limiting)
3. [XSS Protection](#xss-protection)
4. [CORS](#cors)
5. [Body Parser](#body-parser)
6. [Logging (Morgan)](#logging-morgan)
7. [Error Handling](#error-handling)
8. [Authentication Middleware](#authentication-middleware)
9. [Refresh Token Middleware](#refresh-token-middleware)

## Helmet

Helmet เป็น middleware ที่ช่วยเพิ่มความปลอดภัยให้กับแอปพลิเคชัน Express โดยการตั้งค่า HTTP headers ต่างๆ

```javascript
const helmet = require('helmet');
app.use(helmet());
```

### ประโยชน์ที่ได้รับ

- **Content-Security-Policy**: ป้องกันการโจมตี XSS และการฉีดโค้ดอื่นๆ
- **X-Frame-Options**: ป้องกัน clickjacking
- **X-XSS-Protection**: เปิดใช้งานการป้องกัน XSS ของเบราว์เซอร์
- **X-Content-Type-Options**: ป้องกันการตีความประเภทของ MIME
- **Strict-Transport-Security**: บังคับให้ใช้ HTTPS
- **และ headers อื่นๆ อีกมากมาย**

### การปรับแต่ง

หากต้องการปรับแต่งการตั้งค่าของ Helmet:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  // ตัวเลือกอื่นๆ
}));
```

## Rate Limiting

Rate limiting ช่วยป้องกันการโจมตีแบบ brute force หรือ DDoS โดยการจำกัดจำนวน requests ที่มาจาก IP เดียวกันในช่วงเวลาหนึ่ง

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 100, // จำกัด 100 requests ต่อ IP ใน 15 นาที
  standardHeaders: true,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

app.use('/api', limiter);
```

### พารามิเตอร์หลัก

- **windowMs**: ช่วงเวลาที่ใช้ในการนับจำนวน requests (หน่วยเป็นมิลลิวินาที)
- **max**: จำนวน requests สูงสุดที่อนุญาตต่อ IP ในช่วงเวลาที่กำหนด
- **message**: ข้อความที่ส่งกลับเมื่อเกินขีดจำกัด
- **statusCode**: รหัสสถานะ HTTP ที่ส่งกลับเมื่อเกินขีดจำกัด (ค่าเริ่มต้นคือ 429)

### การปรับใช้กับบาง routes

หากต้องการใช้ rate limiting เฉพาะบาง routes:

```javascript
// rate limiting เข้มงวดสำหรับ login
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  max: 5, // 5 ครั้งต่อชั่วโมง
  message: 'Too many login attempts, please try again after an hour'
});

app.use('/api/auth/login', loginLimiter);
```

## XSS Protection

XSS-Clean เป็น middleware ที่ช่วยทำความสะอาดข้อมูลที่ผู้ใช้ป้อนเข้ามา เพื่อป้องกันการโจมตีแบบ Cross-Site Scripting (XSS)

```javascript
const xss = require('xss-clean');
app.use(xss());
```

### การทำงานของ XSS-Clean

- ทำความสะอาด HTML, JavaScript, และอักขระพิเศษที่อาจถูกใช้ในการโจมตีแบบ XSS
- แปลงอักขระพิเศษ (เช่น <, >, &, ") เป็น HTML entities
- ทำงานกับข้อมูลที่อยู่ใน body, query string, และ URL parameters

### ตัวอย่างการใช้งาน

```javascript
// ถ้าผู้ใช้ส่ง: { "name": "<script>alert('XSS')</script>" }
// หลังจากผ่าน xss middleware: { "name": "&lt;script&gt;alert('XSS')&lt;/script&gt;" }
```

## CORS

CORS (Cross-Origin Resource Sharing) ช่วยควบคุมการเข้าถึง API จากแหล่งต้นทางอื่น (origins) ที่ไม่ใช่โดเมนเดียวกับ API

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));
```

### พารามิเตอร์หลัก

- **origin**: กำหนด domain ที่สามารถเข้าถึง API ได้ (อาจเป็น string, array, function, หรือ boolean)
- **methods**: HTTP methods ที่อนุญาต
- **credentials**: อนุญาตให้ส่ง cookies ข้าม domain หรือไม่
- **maxAge**: ระยะเวลาที่ browser จะ cache ผลลัพธ์ของ preflight request
- **allowedHeaders**: headers ที่อนุญาตให้ client ส่งมาได้
- **exposedHeaders**: headers ที่อนุญาตให้ client อ่านได้

### การอนุญาตหลาย origins

```javascript
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://my-production-site.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

## Body Parser

Body Parser เป็น middleware ที่แปลงข้อมูลที่ส่งมาใน HTTP request body ให้อยู่ในรูปแบบที่ใช้งานได้ (เช่น JSON, URL-encoded)

```javascript
// แปลง JSON
app.use(express.json({ limit: '10kb' })); 

// แปลง URL-encoded
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

### พารามิเตอร์หลัก

- **limit**: จำกัดขนาดของ request body (ป้องกันการโจมตีด้วยข้อมูลขนาดใหญ่)
- **extended**: ถ้าเป็น true จะใช้ library 'qs' ในการแปลง URL-encoded data (รองรับโครงสร้างข้อมูลที่ซับซ้อนกว่า)

### ข้อควรระวัง

- ควรกำหนด limit เพื่อป้องกันการโจมตี DoS
- อย่าลืมตรวจสอบและทำความสะอาดข้อมูลหลังจากแปลงแล้ว

## Logging (Morgan)

Morgan เป็น middleware สำหรับบันทึกข้อมูล HTTP requests เพื่อช่วยในการแก้ไขข้อผิดพลาดและตรวจสอบการใช้งาน

```javascript
const morgan = require('morgan');

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
```

### รูปแบบการบันทึก (Formats)

- **dev**: `:method :url :status :response-time ms`
- **combined**: Apache combined log format
- **common**: Apache common log format
- **short**: `:remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms`
- **tiny**: `:method :url :status :res[content-length] - :response-time ms`

### การกำหนดรูปแบบเอง

```javascript
app.use(morgan(':method :url :status :res[content-length] - :response-time ms - :user-agent'));
```

### การบันทึกลงไฟล์

```javascript
const fs = require('fs');
const path = require('path');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'), 
  { flags: 'a' }
);

app.use(morgan('combined', { stream: accessLogStream }));
```

## Error Handling

Middleware สำหรับจัดการข้อผิดพลาดทั้งหมดในแอปพลิเคชัน โดยทำหน้าที่แปลงข้อผิดพลาดให้อยู่ในรูปแบบที่เหมาะสมก่อนส่งกลับไปยัง client

```javascript
// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});
```

### การใช้งานกับ async functions

สำหรับ async functions ควรใช้ wrapper เพื่อจับข้อผิดพลาดและส่งต่อไปยัง error handler:

```javascript
// ฟังก์ชันช่วยจับข้อผิดพลาดใน async functions
const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// ตัวอย่างการใช้งาน
app.get('/api/users', catchAsync(async (req, res) => {
  const users = await User.findAll();
  res.json(users);
}));
```

## Authentication Middleware

Middleware สำหรับตรวจสอบและยืนยันตัวตนของผู้ใช้จาก JWT token

```javascript
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ message: 'Access token is required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// ตัวอย่างการใช้งาน
app.get('/api/protected-route', authenticateToken, (req, res) => {
  // ตรงนี้ req.userId จะมีค่าเป็น ID ของผู้ใช้ที่ยืนยันตัวตนแล้ว
  res.json({ message: 'You have access to this protected route' });
});
```

### การตรวจสอบบทบาท (Role-based Authorization)

```javascript
const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      // ดึงข้อมูลผู้ใช้จากฐานข้อมูลโดยใช้ req.userId
      const user = await User.findByPk(req.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (!roles.includes(user.role)) {
        return res.status(403).json({ 
          message: 'You do not have permission to perform this action' 
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// ตัวอย่างการใช้งาน
app.delete('/api/users/:id', 
  authenticateToken, 
  checkRole(['admin']), 
  (req, res) => {
    // ดำเนินการลบผู้ใช้
  }
);
```

### การจัดการ Refresh Token

```javascript
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    // ตรวจสอบว่า refresh token มีอยู่ในฐานข้อมูลหรือไม่
    const tokenResult = await db.query(
      `SELECT user_id, expires_at
       FROM refresh_tokens
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ'
      });
    }

    const userId = tokenResult.rows[0].user_id;

    // สร้าง access token ใหม่
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      status: 'success',
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการรีเฟรช token'
    });
  }
};
```

การใช้งาน refresh token ในแอปพลิเคชันทำงานดังนี้:

1. เมื่อผู้ใช้เข้าสู่ระบบ (login) จะได้รับ access token และ refresh token
2. เมื่อ access token หมดอายุ ไคลเอนต์ส่ง refresh token ไปยังเอนด์พอยท์ `/auth/refresh-token`
3. เซิร์ฟเวอร์ตรวจสอบ refresh token ในฐานข้อมูล แล้วสร้าง access token ใหม่

กฎการตรวจสอบความถูกต้องของ refresh token (validation):

```javascript
const refreshTokenRules = [
  body('refreshToken')
    .notEmpty().withMessage('กรุณาระบุ refresh token')
];
```

เอนด์พอยท์สำหรับ refresh token:

```javascript
router.post('/refresh-token', refreshTokenRules, validate, authController.refreshToken);
```

## Validate Middleware

Middleware สำหรับตรวจสอบและตรวจความถูกต้องของข้อมูลที่ส่งมาจากผู้ใช้ โดยใช้ express-validator

```javascript
const { body, validationResult, param, query } = require('express-validator');

// ฟังก์ชันสำหรับตรวจสอบผลการตรวจสอบข้อมูล
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

// กฎการตรวจสอบการลงทะเบียน (ตัวอย่าง)
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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('รหัสผ่านต้องประกอบด้วยตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลขอย่างน้อย 1 ตัว')
];
```

### กฎการตรวจสอบสำหรับ Refresh Token

การตรวจสอบความถูกต้องของ refresh token เป็นส่วนสำคัญของการรักษาความปลอดภัยในการจัดการ token ต่างๆ:

```javascript
const refreshTokenRules = [
  body('refreshToken')
    .notEmpty().withMessage('กรุณาระบุ refresh token')
];
```

## Refresh Token Middleware

### การใช้งาน Refresh Token

Refresh Token เป็นกลไกที่ใช้เพื่อต่ออายุ Access Token เมื่อหมดอายุโดยไม่ต้องให้ผู้ใช้เข้าสู่ระบบใหม่ 
ระบบของเราใช้ Refresh Token ตามขั้นตอนดังนี้:

1. เมื่อผู้ใช้เข้าสู่ระบบ จะได้รับ access token และ refresh token
2. เมื่อ access token หมดอายุ ไคลเอนต์ส่ง refresh token ไปยังเอนด์พอยท์ `/auth/refresh-token`
3. เซิร์ฟเวอร์ตรวจสอบ refresh token ในฐานข้อมูล แล้วสร้าง access token ใหม่

กฎการตรวจสอบความถูกต้องของ refresh token (validation):

```javascript
const refreshTokenRules = [
  body('refreshToken')
    .notEmpty().withMessage('กรุณาระบุ refresh token')
];
```

เอนด์พอยท์สำหรับ refresh token:

```javascript
router.post('/refresh-token', refreshTokenRules, validate, authController.refreshToken);
```

### การดำเนินการ Refresh Token

ใน `authController.js` เราดำเนินการกับ Refresh Token ดังนี้:

```javascript
/**
 * รีเฟรช token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    // ตรวจสอบว่า refresh token มีอยู่ในฐานข้อมูลหรือไม่
    const tokenResult = await db.query(
      `SELECT user_id, expires_at
       FROM refresh_tokens
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ'
      });
    }

    const userId = tokenResult.rows[0].user_id;

    // สร้าง access token ใหม่
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      status: 'success',
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการรีเฟรช token'
    });
  }
};
```

### แนวทางการใช้งาน Refresh Token ในแอปพลิเคชัน

1. **ฝั่งไคลเอนต์**:
   - เก็บ Access Token ใน memory หรือ state ของแอปพลิเคชัน
   - เก็บ Refresh Token ใน HttpOnly cookie หรือ secure storage
   - เมื่อได้รับข้อผิดพลาด 401 (Unauthorized) ให้ส่งคำขอไปยังเส้นทาง `/refresh-token`
   - หากได้รับ Access Token ใหม่ ให้ใช้ Token นั้นส่งคำขอเดิมอีกครั้ง
   - หากการรีเฟรชล้มเหลว ให้นำผู้ใช้กลับไปยังหน้าเข้าสู่ระบบ

2. **ฝั่งเซิร์ฟเวอร์**:
   - ตรวจสอบความถูกต้องของ Refresh Token ในฐานข้อมูล
   - ตรวจสอบว่า Token ยังไม่หมดอายุ
   - สร้าง Access Token ใหม่และส่งกลับให้ผู้ใช้
   - ในบางกรณี อาจสร้าง Refresh Token ใหม่ด้วย (token rotation) เพื่อเพิ่มความปลอดภัย

### ความปลอดภัยของ Refresh Token

การใช้งาน Refresh Token ต้องคำนึงถึงความปลอดภัยเป็นสำคัญ ระบบของเราได้ดำเนินการตามแนวทางปฏิบัติด้านความปลอดภัยดังนี้:

1. **เก็บใน Database**: Refresh Token จะถูกเก็บในฐานข้อมูลพร้อมกับข้อมูลผู้ใช้และวันหมดอายุ
2. **อายุการใช้งาน**: กำหนดให้มีอายุการใช้งาน 7 วัน
3. **Invalidation เมื่อออกจากระบบ**: เมื่อผู้ใช้ออกจากระบบ (Logout) Refresh Token จะถูกลบออกจากฐานข้อมูล

```javascript
const logout = async (req, res) => {
  try {
    // ลบ refresh token ออกจากฐานข้อมูล
    await db.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [req.userId]
    );

    res.json({
      status: 'success',
      message: 'ออกจากระบบสำเร็จ'
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการออกจากระบบ'
    });
  }
};
```

### การป้องกัน Token Theft

เพื่อป้องกันการโจรกรรม Token เราใช้วิธีการดังนี้:

1. **ใช้ HTTPS เท่านั้น**: ทุกการสื่อสารระหว่าง Client และ Server ใช้ HTTPS เพื่อป้องกันการดักจับข้อมูล
2. **เก็บ Token ที่ฝั่ง Client อย่างปลอดภัย**: แนะนำให้เก็บใน HttpOnly Cookie หรือ Secure Storage
3. **Token Rotation**: เมื่อมีการใช้ Refresh Token ใหม่ ระบบจะตรวจสอบและบันทึกการใช้งาน

### กระบวนการทำงานแบบสมบูรณ์

กระบวนการทำงานของ Refresh Token ในระบบมีขั้นตอนดังนี้:

1. **Client Side**:
   - เก็บ Access Token ใน Memory หรือ State ของแอปพลิเคชัน
   - เก็บ Refresh Token ใน HttpOnly Cookie หรือ Secure Storage
   - ตรวจสอบอายุ Access Token ก่อนส่งคำขอไปยัง API
   - หาก Access Token หมดอายุ ให้ส่ง Refresh Token ไปขอ Access Token ใหม่

2. **Server Side**:
   - ตรวจสอบ Refresh Token จากฐานข้อมูล
   - ตรวจสอบว่า Token ยังไม่หมดอายุ
   - สร้าง Access Token ใหม่และส่งกลับไปยัง Client

```javascript
// ตัวอย่างการใช้งานที่ฝั่ง Client (React)
const refreshAccessToken = async () => {
  try {
    const response = await axios.post('/api/auth/refresh-token', {
      refreshToken: localStorage.getItem('refreshToken')
    });
    
    if (response.data.status === 'success') {
      localStorage.setItem('accessToken', response.data.data.accessToken);
      return response.data.data.accessToken;
    }
  } catch (error) {
    // หาก refresh token ไม่ถูกต้องหรือหมดอายุ ให้นำผู้ใช้ไปยังหน้า login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
};
```

### การจัดการ Token ในฐานข้อมูล

ระบบของเราใช้ตาราง `refresh_tokens` เพื่อจัดเก็บและจัดการ Refresh Tokens:

```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

-- สร้าง index เพื่อเพิ่มประสิทธิภาพในการค้นหา
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

ด้วยการออกแบบนี้ ระบบสามารถ:
- บันทึกเวลาที่ Token ถูกสร้าง
- ติดตามเวลาที่ Token ถูกใช้งานล่าสุด
- กำหนดเวลาหมดอายุของ Token
- ลบ Token อัตโนมัติเมื่อผู้ใช้ถูกลบออกจากระบบ

### การเพิ่มประสิทธิภาพและความปลอดภัย

เพื่อเพิ่มประสิทธิภาพและความปลอดภัยของระบบ Refresh Token เราแนะนำให้ดำเนินการเพิ่มเติมดังนี้:

1. **การจำกัดจำนวน Token ต่อผู้ใช้**: กำหนดจำนวน Refresh Token สูงสุดต่อผู้ใช้ และลบ Token เก่าเมื่อมีการสร้าง Token ใหม่เกินกำหนด
2. **การตรวจสอบการใช้งานที่ผิดปกติ**: ตรวจสอบและบล็อกการใช้งาน Token ที่มีพฤติกรรมผิดปกติ เช่น การใช้งานจาก IP ที่แตกต่างกันในระยะเวลาสั้นๆ
3. **การใช้งาน Token Blacklist**: เพิ่มตาราง token_blacklist เพื่อเก็บรายการ Token ที่ถูกเพิกถอนสิทธิ์

// ... existing code ...