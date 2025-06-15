# โครงสร้างโปรเจค Blog API

คู่มือนี้อธิบายโครงสร้างไฟล์และโฟลเดอร์ของโปรเจค Blog API

## โครงสร้างไดเรกทอรี

```
backend/
├── config/             # ไฟล์การตั้งค่าต่างๆ
│   └── db.mjs          # การเชื่อมต่อฐานข้อมูล
├── controllers/        # ตัวควบคุมสำหรับจัดการ business logic
├── docs/               # เอกสารโปรเจค
├── middleware/         # middleware สำหรับการประมวลผลคำขอ
│   ├── authMiddleware.mjs    # middleware สำหรับการยืนยันตัวตน
│   └── validateMiddleware.mjs # middleware สำหรับการตรวจสอบข้อมูล
├── migrations/         # ไฟล์สำหรับการสร้างและอัปเดตฐานข้อมูล
│   ├── 01_create_tables.sql      # สร้างตารางพื้นฐาน
│   └── 02_create_blog_tables.sql # สร้างตารางสำหรับบทความ
├── routes/             # เส้นทาง API
├── utils/              # ฟังก์ชันยูทิลิตี้
│   ├── dbMigrate.mjs    # เครื่องมือสำหรับรัน migrations
│   └── errorHandler.mjs # ตัวจัดการข้อผิดพลาด
├── .env                # ไฟล์ตัวแปรสภาพแวดล้อม (ไม่รวมใน Git)
├── .env.example        # ตัวอย่างไฟล์ตัวแปรสภาพแวดล้อม
├── package.json        # รายการ dependencies และ scripts
└── server.mjs          # จุดเริ่มต้นของแอปพลิเคชัน
```

## กลุ่มไฟล์หลัก

### 1. การตั้งค่า (Config)

- **db.mjs**: ใช้สำหรับการเชื่อมต่อกับฐานข้อมูล PostgreSQL

### 2. Controllers

ไฟล์ที่ควรมีในโฟลเดอร์นี้:
- **authController.mjs**: จัดการการลงทะเบียน, เข้าสู่ระบบ, ออกจากระบบ และรีเฟรชโทเคน
- **postController.mjs**: จัดการบทความ (สร้าง, อ่าน, อัปเดต, ลบ)
- **userController.mjs**: จัดการข้อมูลผู้ใช้
- **commentController.mjs**: จัดการความคิดเห็น

### 3. Middleware

- **authMiddleware.mjs**: ตรวจสอบการยืนยันตัวตนและสิทธิ์การเข้าถึง
  - `authenticateToken`: ตรวจสอบ JWT token
  - `checkRole`: ตรวจสอบบทบาทของผู้ใช้
  - `checkOwnership`: ตรวจสอบความเป็นเจ้าของข้อมูล

- **validateMiddleware.mjs**: ตรวจสอบความถูกต้องของข้อมูลที่ส่งเข้ามา
  - `validate`: ตรวจสอบผลลัพธ์ validation
  - `registerRules`: กฎสำหรับการลงทะเบียน
  - `loginRules`: กฎสำหรับการเข้าสู่ระบบ
  - `refreshTokenRules`: กฎสำหรับการรีเฟรช token

### 4. Migrations

- **01_create_tables.sql**: สร้างตารางพื้นฐานของระบบ (users, refresh_tokens, ฯลฯ)
- **02_create_blog_tables.sql**: สร้างตารางสำหรับบทความและความคิดเห็น

### 5. Routes

ไฟล์ที่ควรมีในโฟลเดอร์นี้:
- **index.mjs**: รวมเส้นทาง API ทั้งหมด
- **authRoutes.mjs**: เส้นทางสำหรับการยืนยันตัวตน
- **postRoutes.mjs**: เส้นทางสำหรับบทความ
- **userRoutes.mjs**: เส้นทางสำหรับผู้ใช้
- **commentRoutes.mjs**: เส้นทางสำหรับความคิดเห็น

### 6. Utils

- **dbMigrate.mjs**: เครื่องมือสำหรับรัน migrations ของฐานข้อมูล
- **errorHandler.mjs**: ตัวจัดการข้อผิดพลาดสำหรับใช้ในแอปพลิเคชัน
  - `catchAsync`: จับ error ใน async functions
  - `AppError`: คลาสสำหรับสร้าง error ที่กำหนดเอง

## การเริ่มต้นใช้งาน

1. สร้างไฟล์ `.env` จาก `.env.example`
2. สร้างฐานข้อมูล PostgreSQL ชื่อ `my_blog_db`
3. รัน migrations: `npm run migrate`
4. เริ่มต้นเซิร์ฟเวอร์: `npm run dev`

## เอกสารเพิ่มเติม

สำหรับรายละเอียดเพิ่มเติม โปรดดูไฟล์เอกสารอื่นๆ:
- **middleware_guide.md**: รายละเอียดเกี่ยวกับ middleware ทั้งหมด
- **setup_guide.md**: คำแนะนำในการตั้งค่าโปรเจค
- **api_endpoints.md**: เอกสารอธิบาย API endpoints
- **database_design.md**: โครงสร้างฐานข้อมูล 