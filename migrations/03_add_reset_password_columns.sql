-- Migration: 03_add_reset_password_columns.sql
-- เพิ่มคอลัมน์สำหรับการรีเซ็ตรหัสผ่าน

-- Add reset password columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(100),
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_reset_password_token ON users(reset_password_token); 