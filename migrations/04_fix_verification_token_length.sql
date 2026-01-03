-- Migration: 04_fix_verification_token_length.sql
-- Fix verification_tokens.token column length to support 64-character hex tokens

-- Alter the token column to support longer tokens (64 characters for hex tokens from crypto.randomBytes(32))
ALTER TABLE verification_tokens 
ALTER COLUMN token TYPE VARCHAR(255);

-- Add comment
COMMENT ON COLUMN verification_tokens.token IS 'Verification token (64 characters for hex tokens from crypto.randomBytes(32))';

