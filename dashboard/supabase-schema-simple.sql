-- Omel AI Database Schema (SIMPLIFIED)
-- Run this in Supabase SQL Editor

-- ============================================================
-- FIRST: Drop old tables if they exist (start fresh)
-- ============================================================
DROP TABLE IF EXISTS security_drills CASCADE;
DROP TABLE IF EXISTS guard_logs CASCADE;
DROP TABLE IF EXISTS configurations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS dealerships CASCADE;

-- ============================================================
-- 1. DEALERSHIPS TABLE
-- ============================================================
CREATE TABLE dealerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. PROFILES TABLE
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  dealership_id UUID REFERENCES dealerships(id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. GUARD LOGS TABLE (SIMPLIFIED)
-- ============================================================
CREATE TABLE guard_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'block' or 'pass'
  bot_message TEXT,
  user_message TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. CONFIGURATIONS TABLE (SIMPLIFIED)
-- ============================================================
CREATE TABLE configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id) ON DELETE CASCADE UNIQUE,
  mode VARCHAR(20) DEFAULT 'protection',
  safe_response TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guard_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Dealerships
CREATE POLICY "Users can view own dealership" ON dealerships FOR SELECT USING (
  id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
);

-- Guard Logs
CREATE POLICY "Users can view own logs" ON guard_logs FOR SELECT USING (
  dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
);
-- NOTE: Insert policy restricts to user's own dealership for security.
-- The backend uses service role key (bypasses RLS) to insert logs from guard.js.
-- This policy prevents anonymous clients from inserting logs for arbitrary dealerships.
CREATE POLICY "Users can insert own logs" ON guard_logs FOR INSERT WITH CHECK (
  dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
);

-- Configurations
CREATE POLICY "Users can view own config" ON configurations FOR SELECT USING (
  dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can update own config" ON configurations FOR UPDATE USING (
  dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can insert own config" ON configurations FOR INSERT WITH CHECK (
  dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
);

-- ============================================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. CREATE DEMO DATA
-- ============================================================

-- Create dealership
INSERT INTO dealerships (id, name, slug) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Koons Motors', 'koons-motors');

-- Create config
INSERT INTO configurations (dealership_id, mode, phone, safe_response)
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'protection', 
  '(555) 123-4567',
  'For accurate information, please speak with our team directly. Call us at (555) 123-4567.'
);

-- Insert demo logs
INSERT INTO guard_logs (dealership_id, type, bot_message, user_message, reason) VALUES 
('00000000-0000-0000-0000-000000000001', 'block', 'Sure, I can guarantee you''ll get $8,000 for your trade-in!', 'Can you guarantee a price?', 'Price guarantee detected'),
('00000000-0000-0000-0000-000000000001', 'block', 'We''re offering 0% APR on all vehicles!', 'What rates do you have?', 'APR promise detected'),
('00000000-0000-0000-0000-000000000001', 'pass', 'Hello! How can I help you today?', 'Hi', 'Safe greeting'),
('00000000-0000-0000-0000-000000000001', 'pass', 'We have F-150s available. Want to schedule a test drive?', 'Do you have F-150s?', 'Safe response');

-- ============================================================
-- 8. LINK YOUR USER ACCOUNT
-- ============================================================
UPDATE profiles 
SET dealership_id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'kymkhw279@gmail.com';

-- If profile doesn't exist yet, create it
INSERT INTO profiles (id, email, dealership_id)
SELECT id, email, '00000000-0000-0000-0000-000000000001'
FROM auth.users 
WHERE email = 'kymkhw279@gmail.com'
ON CONFLICT (id) DO UPDATE SET dealership_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================
-- DONE!
-- ============================================================
