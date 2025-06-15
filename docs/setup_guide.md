# คู่มือการติดตั้งและใช้งาน Blog API

คู่มือนี้จะแนะนำวิธีการติดตั้งและรันแอปพลิเคชัน Blog API

## ความต้องการของระบบ

- Node.js (v16 หรือใหม่กว่า)
- npm (v7 หรือใหม่กว่า)
- PostgreSQL (v12 หรือใหม่กว่า)

## การติดตั้ง

### 1. โคลนโปรเจค

```bash
git clone <repository-url>
cd my-personal-blog-2025/backend
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่าตัวแปรสภาพแวดล้อม

สร้างไฟล์ `.env` จาก `.env.example`:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env` เพื่อกำหนดค่าต่างๆ:

```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=my_blog_db
DB_USER=postgres
DB_PASSWORD=your_password

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS Configuration
CLIENT_URL=http://localhost:3000 
```

### 4. สร้างฐานข้อมูล

เข้าสู่ PostgreSQL และสร้างฐานข้อมูล:

```bash
psql -U postgres
```

```sql
CREATE DATABASE my_blog_db;
\q
```

### 5. รัน Migrations

รันคำสั่งต่อไปนี้เพื่อสร้างตารางในฐานข้อมูล:

```bash
npm run migrate
```

## การรันแอปพลิเคชัน

### การรันในโหมดพัฒนา

```bash
npm run dev
```

### การรันในโหมดการผลิต

```bash
npm start
```

## การทดสอบ API

หลังจากรันแอปพลิเคชันแล้ว คุณสามารถทดสอบ API ได้โดยส่งคำขอไปยัง:

- Health Check: `http://localhost:5000/api/health`
- API Base URL: `http://localhost:5000/api`

### ตัวอย่างการใช้งาน API:

#### 1. ตรวจสอบสถานะเซิร์ฟเวอร์

```bash
curl http://localhost:5000/api/health
```

#### 2. ลงทะเบียนผู้ใช้ใหม่

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123",
    "full_name": "Test User"
  }'
```

#### 3. เข้าสู่ระบบ

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

## โครงสร้างโปรเจค

สำหรับข้อมูลเกี่ยวกับโครงสร้างโปรเจค โปรดดูที่ [คู่มือโครงสร้างโปรเจค](./project_structure.md)

## API Endpoints

สำหรับรายละเอียดเกี่ยวกับ API endpoints ทั้งหมด โปรดดูที่ [คู่มือ API](./api_endpoints.md)

## การแก้ไขปัญหา

### ปัญหาการเชื่อมต่อฐานข้อมูล

หากคุณพบปัญหาในการเชื่อมต่อกับฐานข้อมูล:

1. ตรวจสอบว่า PostgreSQL กำลังทำงานอยู่:
   ```bash
   pg_isready
   ```

2. ตรวจสอบข้อมูลการเชื่อมต่อในไฟล์ `.env`

3. ตรวจสอบว่าผู้ใช้ PostgreSQL มีสิทธิ์เข้าถึงฐานข้อมูล

### ปัญหาในการรัน Migrations

หากมีปัญหาในการรัน migrations:

1. ตรวจสอบข้อความผิดพลาดในการรัน migrations
2. ตรวจสอบว่าฐานข้อมูลมีอยู่จริง
3. ลบฐานข้อมูลและสร้างใหม่ถ้าจำเป็น

## การสำรองข้อมูลและการกู้คืน

### การสำรองฐานข้อมูล

```bash
pg_dump -U postgres my_blog_db > backup.sql
```

### การกู้คืนฐานข้อมูล

```bash
psql -U postgres my_blog_db < backup.sql
``` 