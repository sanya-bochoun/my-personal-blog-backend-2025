-- Script to fix verification_tokens table
-- Run this manually if migration doesn't work

-- Check current column type
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'verification_tokens' 
  AND column_name = 'token';

-- Fix the column length
ALTER TABLE verification_tokens 
ALTER COLUMN token TYPE VARCHAR(255);

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'verification_tokens' 
  AND column_name = 'token';

-- Check existing tokens (if any are truncated)
SELECT 
    id,
    user_id,
    LEFT(token, 20) || '...' as token_preview,
    LENGTH(token) as token_length,
    type,
    expires_at
FROM verification_tokens
WHERE type = 'email_verification'
ORDER BY created_at DESC
LIMIT 10;

