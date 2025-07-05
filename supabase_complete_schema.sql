-- Complete Supabase Database Schema for LangTours
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    userNameChangable TEXT,
    langSpeak TEXT DEFAULT 'EN',
    locationsDone JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurants table (already exists but ensuring it's complete)
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    route_name TEXT NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    date_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    photo_file_id TEXT,
    ocrdata JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create menu_ocr_feedback table for machine learning
CREATE TABLE IF NOT EXISTS menu_ocr_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_items JSONB,
    corrected_items JSONB,
    raw_text TEXT,
    restaurant_name TEXT,
    image_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    menu_structure JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for photos (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS)

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_ocr_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for restaurants
CREATE POLICY "Users can view own restaurants" ON restaurants
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view all restaurants" ON restaurants
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own restaurants" ON restaurants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own restaurants" ON restaurants
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own restaurants" ON restaurants
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for menu_ocr_feedback
CREATE POLICY "Users can view own feedback" ON menu_ocr_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback" ON menu_ocr_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage policies for photos bucket
CREATE POLICY "Anyone can view photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own photos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own photos" ON storage.objects
    FOR DELETE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(lat, lng);
CREATE INDEX IF NOT EXISTS idx_menu_ocr_feedback_user_id ON menu_ocr_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_route_name ON restaurants(route_name);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();