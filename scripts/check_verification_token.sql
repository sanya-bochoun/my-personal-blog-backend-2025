-- Script to check verification tokens in database
-- Usage: psql -U postgres -d my_blog_db -f check_verification_token.sql

-- Check all verification tokens
SELECT 
  vt.id,
  vt.user_id,
  LEFT(vt.token, 20) || '...' as token_preview,
  LENGTH(vt.token) as token_length,
  vt.type,
  vt.expires_at,
  vt.created_at,
  u.email,
  u.is_verified,
  CASE 
    WHEN vt.expires_at > NOW() THEN 'Valid'
    ELSE 'Expired'
  END as status
FROM verification_tokens vt
INNER JOIN users u ON vt.user_id = u.id
WHERE vt.type = 'email_verification'
ORDER BY vt.created_at DESC
LIMIT 10;

-- Check specific token (replace with actual token)
-- SELECT * FROM verification_tokens WHERE token = 'ae6a03ce893892e694180fdbf18310a47893eb5d1c8f798e6cf1b373e5fd9bf8';

