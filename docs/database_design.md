# การออกแบบฐานข้อมูลสำหรับระบบ Authentication

## โครงสร้างฐานข้อมูล PostgreSQL

การออกแบบฐานข้อมูลนี้ครอบคลุมระบบ authentication และการจัดการผู้ใช้สำหรับบล็อกส่วนตัว

### 1. ตาราง users (ข้อมูลผู้ใช้)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  full_name VARCHAR(100),
  avatar_url VARCHAR(255),
  bio TEXT,
  role VARCHAR(20) DEFAULT 'user',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### คำอธิบายฟิลด์:
- **id**: รหัสผู้ใช้ (auto-increment)
- **username**: ชื่อผู้ใช้สำหรับเข้าสู่ระบบ (ต้องไม่ซ้ำกัน)
- **email**: อีเมลของผู้ใช้ (ต้องไม่ซ้ำกัน)
- **password**: รหัสผ่านที่เข้ารหัสแล้ว (จะใช้ bcrypt)
- **full_name**: ชื่อ-นามสกุลจริง (ไม่บังคับ)
- **avatar_url**: URL ของรูปโปรไฟล์ (ไม่บังคับ)
- **bio**: ข้อมูลส่วนตัวหรือประวัติโดยย่อ (ไม่บังคับ)
- **role**: บทบาทของผู้ใช้ (เช่น user, admin)
- **is_verified**: สถานะการยืนยันบัญชี
- **created_at**: เวลาที่สร้างบัญชี
- **updated_at**: เวลาที่อัปเดตข้อมูลล่าสุด

### 2. ตาราง refresh_tokens (สำหรับ JWT Refresh Token)

```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### คำอธิบายฟิลด์:
- **id**: รหัส token
- **user_id**: รหัสผู้ใช้ที่เป็นเจ้าของ token (foreign key)
- **token**: refresh token
- **expires_at**: เวลาหมดอายุของ token
- **created_at**: เวลาที่สร้าง token

### 3. ตาราง verification_tokens (สำหรับการยืนยันอีเมล)

```sql
CREATE TABLE verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### คำอธิบายฟิลด์:
- **id**: รหัส token
- **user_id**: รหัสผู้ใช้ที่เป็นเจ้าของ token
- **token**: token สำหรับยืนยันอีเมลหรือรีเซ็ตรหัสผ่าน
- **type**: ประเภทของ token (เช่น email_verification, password_reset)
- **expires_at**: เวลาหมดอายุของ token
- **created_at**: เวลาที่สร้าง token

### 4. ตาราง user_sessions (สำหรับติดตามการเข้าสู่ระบบ)

```sql
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### คำอธิบายฟิลด์:
- **id**: รหัส session
- **user_id**: รหัสผู้ใช้
- **ip_address**: IP ของผู้ใช้
- **user_agent**: ข้อมูลเบราว์เซอร์และอุปกรณ์
- **last_active**: เวลาที่ทำกิจกรรมล่าสุด
- **created_at**: เวลาที่เริ่ม session

## ความสัมพันธ์ระหว่างตาราง

1. **users - refresh_tokens**: ผู้ใช้หนึ่งคนอาจมีหลาย refresh tokens (one-to-many)
2. **users - verification_tokens**: ผู้ใช้หนึ่งคนอาจมีหลาย verification tokens (one-to-many)
3. **users - user_sessions**: ผู้ใช้หนึ่งคนอาจมีหลาย sessions (one-to-many)

## แผนภาพความสัมพันธ์

```
users
  ^
  |
  |--- refresh_tokens
  |
  |--- verification_tokens
  |
  |--- user_sessions
```

## คำสั่ง SQL สำหรับการสร้างตาราง

```sql
-- สร้างตาราง users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  full_name VARCHAR(100),
  avatar_url VARCHAR(255),
  bio TEXT,
  role VARCHAR(20) DEFAULT 'user',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตาราง refresh_tokens
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตาราง verification_tokens
CREATE TABLE verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตาราง user_sessions
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## ข้อควรพิจารณา

1. **ความปลอดภัย**:
   - รหัสผ่านควรเข้ารหัสด้วย bcrypt
   - ควรมีการตรวจสอบความถูกต้องของอีเมลและข้อมูลที่ป้อนเข้ามา

2. **Performance**:
   - ควรมีการสร้าง indexes สำหรับคอลัมน์ที่ใช้ในการค้นหาบ่อย
   - ควรพิจารณาการจัดการ token ที่หมดอายุแล้วเพื่อป้องกันฐานข้อมูลมีขนาดใหญ่เกินไป

3. **การพัฒนาต่อในอนาคต**:
   - อาจเพิ่มระบบจัดการสิทธิ์ที่ซับซ้อนขึ้น
   - อาจเพิ่มระบบการยืนยันตัวตนแบบ Two-Factor Authentication (2FA) 