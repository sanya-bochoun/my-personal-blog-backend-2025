import path from 'path';
import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { query } from './db.mjs';

// ตั้งค่า dotenv
dotenv.config();

// หา directory path ของไฟล์ปัจจุบัน
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ตาราง migrations สำหรับเก็บประวัติการรัน migrations
const createMigrationsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// ฟังก์ชันสำหรับดึงรายการ migrations ที่รันไปแล้ว
const getMigratedFiles = async () => {
  const result = await query('SELECT name FROM migrations');
  return result.rows.map(row => row.name);
};

// ฟังก์ชันสำหรับ migrate ฐานข้อมูล
const migrate = async () => {
  try {
    console.log('เริ่มต้นการ migrate ฐานข้อมูล...');
    
    // สร้างตาราง migrations ถ้ายังไม่มี
    await createMigrationsTable();
    
    // ดึงรายการ migrations ที่รันไปแล้ว
    const migratedFiles = await getMigratedFiles();
    
    // อ่านไฟล์ migrations ทั้งหมด
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = await fs.readdir(migrationsDir);
    
    // กรองเอาเฉพาะไฟล์ .sql และเรียงตามชื่อ
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // ตรวจสอบว่ามีไฟล์ใหม่ที่ยังไม่ได้รันหรือไม่
    let newMigrations = 0;
    
    // รัน migrations ที่ยังไม่ได้รัน
    for (const file of migrationFiles) {
      if (!migratedFiles.includes(file)) {
        console.log(`กำลังรัน migration: ${file}`);
        
        // อ่านเนื้อหาของไฟล์
        const filePath = path.join(migrationsDir, file);
        const sql = await fs.readFile(filePath, 'utf8');
        
        // รัน SQL
        await query(sql);
        
        // บันทึกว่าได้รัน migration นี้แล้ว
        await query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        
        console.log(`Migration สำเร็จ: ${file}`);
        newMigrations++;
      }
    }
    
    if (newMigrations === 0) {
      console.log('ไม่มี migrations ใหม่ที่ต้องรัน');
    } else {
      console.log(`รัน ${newMigrations} migrations สำเร็จ`);
    }
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการ migrate:', error.message);
    process.exit(1);
  }
};

// รัน migrations
migrate(); 