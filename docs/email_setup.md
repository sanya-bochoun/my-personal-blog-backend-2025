# Email Configuration Guide

คู่มือการตั้งค่า Email สำหรับส่ง Password Reset Email

## ⚠️ สิ่งสำคัญที่ต้องเข้าใจ

**Email Configuration ใน backend เป็นการตั้งค่าสำหรับ SERVER ที่ใช้ส่ง email ออกไป**

- **ไม่เกี่ยวกับ email address ของ user ที่สมัคร**
- User สามารถใช้ email provider ใดก็ได้ในการสมัคร (Gmail, Outlook, Yahoo, Hotmail, ฯลฯ)
- Server จะใช้ email configuration ที่ตั้งไว้ใน `.env` เพื่อส่ง email ไปยัง user ทุกคน
- ตัวอย่าง: ถ้า server ตั้งค่าใช้ Gmail ส่ง email ก็สามารถส่งไปยัง user ที่ใช้ Outlook email ได้

## วิธีตั้งค่าสำหรับ Gmail

### 1. สร้าง App Password สำหรับ Gmail

1. ไปที่ Google Account: https://myaccount.google.com/
2. เลือก **Security** (ความปลอดภัย)
3. เปิด **2-Step Verification** (การยืนยันตัวตน 2 ขั้นตอน) ถ้ายังไม่ได้เปิด
4. หลังจากเปิด 2-Step Verification แล้ว ให้ไปที่ **App passwords** (รหัสผ่านของแอป)
5. เลือก **Mail** และ **Other (Custom name)**
6. ใส่ชื่อ เช่น "Blog Password Reset"
7. คลิก **Generate**
8. **คัดลอกรหัส 16 หลัก** (ใช้เป็น EMAIL_PASS)

### 2. ตั้งค่าในไฟล์ .env

เปิดไฟล์ `backend/.env` และเพิ่มหรือแก้ไขบรรทัดต่อไปนี้:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Oh!myBlog
```

**ตัวอย่าง:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=example@gmail.com
EMAIL_PASS=abcdefghijklmnop
EMAIL_FROM=example@gmail.com
EMAIL_FROM_NAME=Oh!myBlog
```

**หมายเหตุ:** App Password จาก Google อาจมีช่องว่าง (เช่น "abcd efgh ijkl mnop") แต่ใน .env file สามารถใส่แบบมีช่องว่างหรือลบช่องว่างออกก็ได้ (เช่น "abcdefghijklmnop") แต่ถ้าใช้แบบมีช่องว่าง ต้องแน่ใจว่าคัดลอกครบทุกตัว รวมทั้งช่องว่างด้วย

### 3. หมายเหตุสำคัญ

- **EMAIL_PASS** ต้องเป็น App Password (16 หลัก) ไม่ใช่รหัสผ่าน Gmail ปกติ
- ถ้าไม่มี 2-Step Verification จะไม่สามารถสร้าง App Password ได้
- App Password ควรเก็บเป็นความลับ ไม่เปิดเผยใน public repository

### 4. สำหรับ Email Provider อื่น

#### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

#### Yahoo Mail
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

#### Custom SMTP Server
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_SECURE=false
# หรือ
EMAIL_PORT=465
EMAIL_SECURE=true
```

### 5. ทดสอบการตั้งค่า

หลังจากตั้งค่าแล้ว ให้:
1. Restart backend server
2. ลองใช้ฟีเจอร์ "Forgot Password" ด้วย email address ใดๆ (Gmail, Outlook, Yahoo, ฯลฯ)
3. Email จะถูกส่งจาก server email (ที่ตั้งใน `.env`) ไปยัง email address ที่ user กรอก
4. ตรวจสอบ inbox ของ email ที่ user กรอก (ไม่ใช่ email ของ server)

### 6. Troubleshooting

**ปัญหา: 535-5.7.8 Username and Password not accepted (BadCredentials)**
- **App Password หมดอายุหรือถูก revoke** → ต้องสร้าง App Password ใหม่
- ตรวจสอบว่า EMAIL_PASS ไม่มีช่องว่าง (ถ้ามีช่องว่างให้ลบออก) หรือถ้ามีช่องว่างใน .env file ก็ได้ แต่ต้องแน่ใจว่าคัดลอกครบทุกตัว
- ตรวจสอบว่าใช้ App Password (16 หลัก) ไม่ใช่รหัสผ่าน Gmail ปกติ
- ตรวจสอบว่าเปิด 2-Step Verification แล้ว
- ตรวจสอบว่า EMAIL_USER ตรงกับ email ที่สร้าง App Password

**วิธีแก้:**
1. ไปที่ https://myaccount.google.com/apppasswords
2. ลบ App Password เก่าถ้าจำเป็น
3. สร้าง App Password ใหม่
4. คัดลอกรหัส 16 หลัก (อาจมีช่องว่างหรือไม่มีก็ได้)
5. อัปเดต EMAIL_PASS ใน .env file
6. Restart backend server

**ปัญหา: Authentication failed (ทั่วไป)**
- ตรวจสอบว่า EMAIL_USER และ EMAIL_PASS ถูกต้อง
- ตรวจสอบว่าใช้ App Password ไม่ใช่รหัสผ่านปกติ
- ตรวจสอบว่าเปิด 2-Step Verification แล้ว

**ปัญหา: Connection timeout**
- ตรวจสอบ firewall/network settings
- ลองเปลี่ยน PORT เป็น 465 และ EMAIL_SECURE เป็น true

**ปัญหา: Email not sending**
- ตรวจสอบ backend logs เพื่อดู error message
- ตรวจสอบว่า environment variables ถูก load แล้ว (restart server)

