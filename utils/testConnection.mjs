import connectionPool from './db.mjs';

async function testConnection() {
  try {
    const client = await connectionPool.connect();
    console.log('✅ Successfully connected to PostgreSQL database!');
    
    // ทดสอบ query 
    const result = await client.query('SELECT NOW()');
    console.log('Current database time:', result.rows[0].now);
    
    client.release();
  } catch (error) {
    console.error('❌ Error connecting to PostgreSQL database:', error.message);
  } finally {
    // ปิด connection pool
    await connectionPool.end();
  }
}

// รันฟังก์ชันทดสอบ
testConnection(); 