import pool from '../utils/db.mjs';

const checkArticles = async () => {
  try {
    // ตรวจสอบโครงสร้างตาราง
    console.log('Checking table structure...');
    const tableStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'posts';
    `);
    console.log('Table structure:', tableStructure.rows);

    // ตรวจสอบข้อมูลในตาราง
    console.log('\nChecking table data...');
    const articles = await pool.query('SELECT * FROM posts;');
    console.log('Number of articles:', articles.rows.length);
    console.log('Articles:', articles.rows);

  } catch (error) {
    console.error('Error checking articles:', error);
  } finally {
    await pool.end();
  }
};

checkArticles(); 