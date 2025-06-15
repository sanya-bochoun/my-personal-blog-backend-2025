import db from '../utils/db.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createNotificationsTable() {
  try {
    // อ่านไฟล์ SQL
    const sql = fs.readFileSync(
      path.join(__dirname, 'notifications.sql'),
      'utf8'
    );

    // รัน SQL
    await db.query(sql);
    console.log('สร้างตาราง notifications สำเร็จ');
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการสร้างตาราง:', error);
  } finally {
    // ปิดการเชื่อมต่อ
    await db.end();
  }
}

createNotificationsTable(); 