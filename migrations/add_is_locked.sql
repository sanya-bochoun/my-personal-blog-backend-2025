-- เพิ่มคอลัมน์ is_locked ในตาราง users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- อัพเดทข้อมูลที่มีอยู่ให้เป็น false (active) ทั้งหมด
UPDATE users SET is_locked = false WHERE is_locked IS NULL; 