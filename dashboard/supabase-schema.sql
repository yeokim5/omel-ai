-- LOMEL AI Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ============================================================
-- 1. DEALERSHIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS dealerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'starter',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  dealership_id UUID REFERENCES dealerships(id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. GUARD LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS guard_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'evaluation', 'block', 'scan'
  bot_message TEXT,
  user_message TEXT,
  verdict VARCHAR(20), -- 'pass', 'fail'
  reason TEXT,
  category VARCHAR(50), -- 'price_promise', 'rate_quote', etc.
  risk_level VARCHAR(20), -- 'low', 'medium', 'high'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. CONFIGURATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id) ON DELETE CASCADE UNIQUE,
  mode VARCHAR(20) DEFAULT 'protection', -- 'monitor', 'protection'
  safe_response TEXT DEFAULT 'For accurate information on this topic, please speak with our team directly. They''ll provide you with precise details based on your specific situation.',
  phone VARCHAR(20),
  email_reports VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'none'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. SECURITY DRILLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS security_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'passed', 'failed'
  prompts_tested INTEGER DEFAULT 0,
  vulnerabilities_found INTEGER DEFAULT 0,
  results JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_guard_logs_dealership ON guard_logs(dealership_id);
CREATE INDEX IF NOT EXISTS idx_guard_logs_created ON guard_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guard_logs_type ON guard_logs(type);
CREATE INDEX IF NOT EXISTS idx_profiles_dealership ON profiles(dealership_id);

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guard_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_drills ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Dealerships: Users can view their own dealership
CREATE POLICY "Users can view own dealership" ON dealerships
  FOR SELECT USING (
    id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
  );

-- Guard Logs: Users can view logs from their dealership
CREATE POLICY "Users can view own dealership logs" ON guard_logs
  FOR SELECT USING (
    dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
  );

-- Allow inserting logs (for the backend API)
CREATE POLICY "Allow insert logs" ON guard_logs
  FOR INSERT WITH CHECK (true);

-- Configurations: Users can view/update their dealership config
CREATE POLICY "Users can view own config" ON configurations
  FOR SELECT USING (
    dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own config" ON configurations
  FOR UPDATE USING (
    dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
  );

-- Security Drills: Users can view their dealership drills
CREATE POLICY "Users can view own drills" ON security_drills
  FOR SELECT USING (
    dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================================
-- 8. FUNCTION: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 9. INSERT DEMO DATA (Optional - for testing)
-- ============================================================

-- Create a demo dealership
INSERT INTO dealerships (id, name, slug, plan) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Koons Motors', 'koons-motors', 'pro')
ON CONFLICT (slug) DO NOTHING;

-- Create demo configuration
INSERT INTO configurations (dealership_id, mode, phone)
VALUES ('00000000-0000-0000-0000-000000000001', 'protection', '(555) 123-4567')
ON CONFLICT (dealership_id) DO NOTHING;

-- Insert some demo logs
INSERT INTO guard_logs (dealership_id, type, bot_message, user_message, verdict, reason, category, risk_level)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'block', 'Sure, I can guarantee you''ll get $8,000 for your trade-in!', 'Can you guarantee a price for my trade-in?', 'fail', 'Contains specific price guarantee for trade-in value', 'price_promise', 'high'),
  ('00000000-0000-0000-0000-000000000001', 'block', 'We''re offering 0% APR on all vehicles this month!', 'What financing rates do you have?', 'fail', 'Promises specific APR rate without verification', 'rate_quote', 'high'),
  ('00000000-0000-0000-0000-000000000001', 'evaluation', 'Hello! How can I help you today?', 'Hi', 'pass', 'Safe greeting message', NULL, 'low'),
  ('00000000-0000-0000-0000-000000000001', 'evaluation', 'We have a great selection of F-150s. Would you like to schedule a test drive?', 'Do you have any F-150s?', 'pass', 'Appropriate vehicle inquiry response', NULL, 'low');

-- ============================================================
-- DONE! Your database is ready.
-- ============================================================
