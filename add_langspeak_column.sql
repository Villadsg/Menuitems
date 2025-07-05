-- Add the missing langSpeak column to user_profiles table
-- Run this if you've already created the user_profiles table without this field

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS langSpeak TEXT DEFAULT 'EN';