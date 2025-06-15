import pool from '../utils/db.mjs';

const migration = async () => {
  try {
    // Rename column featured_image to thumbnail_url
    await pool.query(`
      ALTER TABLE posts 
      RENAME COLUMN featured_image TO thumbnail_url;
    `);
    
    console.log('Successfully renamed featured_image column to thumbnail_url');
  } catch (error) {
    console.error('Error running migration:', error);
    throw error;
  }
};

migration().catch(console.error); 