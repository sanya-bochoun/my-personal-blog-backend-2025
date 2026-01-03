-- Migration: 05_mark_existing_users_as_verified.sql
-- Mark all existing users (registered before email verification feature) as verified

-- Set all existing users to verified (users registered before email verification feature)
UPDATE users 
SET is_verified = true, updated_at = NOW()
WHERE is_verified = false;

-- Verify the update
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_verified = true) as verified_users,
    COUNT(*) FILTER (WHERE is_verified = false) as unverified_users
FROM users;

