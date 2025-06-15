import { testConnection } from './db.mjs';

testConnection()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 