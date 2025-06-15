import db from './db.mjs';

async function createTestNotification() {
  try {
    // ดึง user_id จากฐานข้อมูลก่อน
    const userResult = await db.query('SELECT id FROM users LIMIT 1');
    
    if (userResult.rows.length === 0) {
      console.log('ไม่พบผู้ใช้ในระบบ');
      return;
    }

    const userId = userResult.rows[0].id;

    // เพิ่มการแจ้งเตือนทดสอบ
    const result = await db.query(
      `INSERT INTO notifications 
        (user_id, type, message, link) 
       VALUES 
        ($1, $2, $3, $4)
       RETURNING *`,
      [userId, 'test', 'นี่คือการแจ้งเตือนทดสอบ', '/test']
    );

    console.log('สร้างการแจ้งเตือนทดสอบสำเร็จ:', result.rows[0]);
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการสร้างการแจ้งเตือนทดสอบ:', error);
  } finally {
    await db.end();
  }
}

createTestNotification(); 