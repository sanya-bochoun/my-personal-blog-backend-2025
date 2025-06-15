import db from './db.mjs';
import jwt from 'jsonwebtoken';

// ใส่ token ที่ได้จาก login ตรงนี้
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc0NDQ4Mjc0MywiZXhwIjoxNzQ0NDg2MzQzfQ.KW3RTAs7AM-hbue5jN5j20SUL3fxA37C_VmUJ1aPzCo';

async function checkCurrentUser() {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    const result = await db.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length > 0) {
      console.log('User found:', result.rows[0]);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

checkCurrentUser(); 