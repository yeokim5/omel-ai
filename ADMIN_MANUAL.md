# Omel AI - Admin Manual
## Managing Dealership Customers via Supabase

This guide covers how to add new dealership customers and manage their accounts.

---

## 🆕 Adding a New Dealership Customer

### Step 1: Create the Dealership

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this SQL (replace with customer's info):

```sql
-- Create the dealership
INSERT INTO dealerships (name, slug) 
VALUES ('Smith Ford', 'smith-ford');

-- Create their configuration
INSERT INTO configurations (dealership_id, mode, phone, safe_response)
SELECT 
  id, 
  'protection',  -- or 'monitor'
  '(555) 999-1234',  -- their phone number
  'For accurate information, please contact our team directly at (555) 999-1234.'
FROM dealerships 
WHERE slug = 'smith-ford';
```

**Slug naming rules:**
- Lowercase only
- Use hyphens instead of spaces
- Keep it short: `koons-motors`, `smith-ford`, `joe-machens-toyota`

### Step 2: Create User Account

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **Add User** → **Create New User**
3. Enter:
   - **Email:** Customer's email (e.g., `manager@smithford.com`)
   - **Password:** Temporary password (e.g., `TempPass123!`)
   - Check **Auto Confirm User** ✓
4. Click **Create User**

### Step 3: Link User to Dealership

1. Go to **SQL Editor**
2. Run this SQL:

```sql
UPDATE profiles 
SET dealership_id = (SELECT id FROM dealerships WHERE slug = 'smith-ford')
WHERE email = 'manager@smithford.com';
```

### Step 4: Give Them the Script

Send the customer this code to add to their website `<head>`:

```html
<script 
  src="https://cdn.omel.ai/guard.js" 
  data-dealership="smith-ford"
  data-api="https://api.omel.ai">
</script>
```

For now (local testing), use:
```html
<script 
  src="/guard.js" 
  data-dealership="smith-ford"
  data-api="http://localhost:3001">
</script>
```

### Step 5: Send Welcome Email

Send the customer:

```
Subject: Your Omel AI Dashboard Access

Hi [Name],

Your Omel AI protection is now active! Here are your login details:

Dashboard: https://dashboard.omel.ai/login
Email: manager@smithford.com
Temporary Password: TempPass123!

Please change your password after logging in.

Installation: Add this code to your website's <head> tag:

<script 
  src="https://cdn.omel.ai/guard.js" 
  data-dealership="smith-ford"
  data-api="https://api.omel.ai">
</script>

Questions? Reply to this email.

- Omel AI Team
```

---

## 👥 Adding Multiple Users to Same Dealership

If a dealership needs multiple logins:

1. Create additional user in **Authentication** → **Add User**
2. Link them to the same dealership:

```sql
UPDATE profiles 
SET dealership_id = (SELECT id FROM dealerships WHERE slug = 'smith-ford')
WHERE email = 'sales@smithford.com';
```

---

## 🔑 Password Reset

### Option A: User Requests Reset
- They click "Forgot Password" on login page (if you add this feature)
- They receive email with reset link

### Option B: Admin Sends Reset (Current Method)
1. Go to **Authentication** → **Users**
2. Find the user
3. Click **⋮** (three dots) → **Send password recovery**

### Option C: Admin Sets New Password
1. Go to **Authentication** → **Users**
2. Find the user
3. Click **⋮** → **Update user**
4. Enter new password

---

## ❌ Removing a Customer

### Disable Access (Keep Data)
```sql
-- Remove user's dealership link
UPDATE profiles 
SET dealership_id = NULL
WHERE email = 'manager@smithford.com';
```

### Delete Everything
```sql
-- Delete in this order (due to foreign keys):
DELETE FROM guard_logs WHERE dealership_id = (SELECT id FROM dealerships WHERE slug = 'smith-ford');
DELETE FROM configurations WHERE dealership_id = (SELECT id FROM dealerships WHERE slug = 'smith-ford');
DELETE FROM profiles WHERE dealership_id = (SELECT id FROM dealerships WHERE slug = 'smith-ford');
DELETE FROM dealerships WHERE slug = 'smith-ford';
```

Then delete user from **Authentication** → **Users** → **Delete**

---

## 📊 Viewing Customer Data

### See All Dealerships
```sql
SELECT * FROM dealerships ORDER BY created_at DESC;
```

### See All Users
```sql
SELECT p.email, p.role, d.name as dealership, p.created_at
FROM profiles p
LEFT JOIN dealerships d ON p.dealership_id = d.id
ORDER BY p.created_at DESC;
```

### See Logs for a Dealership
```sql
SELECT * FROM guard_logs 
WHERE dealership_id = (SELECT id FROM dealerships WHERE slug = 'smith-ford')
ORDER BY created_at DESC
LIMIT 50;
```

### Count Blocks per Dealership
```sql
SELECT d.name, COUNT(*) as blocks
FROM guard_logs g
JOIN dealerships d ON g.dealership_id = d.id
WHERE g.type = 'block'
GROUP BY d.name
ORDER BY blocks DESC;
```

---

## ⚙️ Changing Customer Settings

### Change Mode (Protection ↔ Monitor)
```sql
UPDATE configurations 
SET mode = 'monitor'  -- or 'protection'
WHERE dealership_id = (SELECT id FROM dealerships WHERE slug = 'smith-ford');
```

### Update Phone Number
```sql
UPDATE configurations 
SET phone = '(555) 111-2222'
WHERE dealership_id = (SELECT id FROM dealerships WHERE slug = 'smith-ford');
```

### Update Safe Response Message
```sql
UPDATE configurations 
SET safe_response = 'Please call us at (555) 111-2222 for accurate information.'
WHERE dealership_id = (SELECT id FROM dealerships WHERE slug = 'smith-ford');
```

---

## 🔍 Quick Reference: SQL Templates

### New Customer (Copy & Edit)
```sql
-- 1. Create dealership
INSERT INTO dealerships (name, slug) VALUES ('DEALERSHIP_NAME', 'dealership-slug');

-- 2. Create config
INSERT INTO configurations (dealership_id, mode, phone, safe_response)
SELECT id, 'protection', '(555) 000-0000', 'Contact us at (555) 000-0000 for accurate info.'
FROM dealerships WHERE slug = 'dealership-slug';

-- 3. Link user (after creating in Auth)
UPDATE profiles 
SET dealership_id = (SELECT id FROM dealerships WHERE slug = 'dealership-slug')
WHERE email = 'user@example.com';
```

### Script Tag Template
```html
<script 
  src="https://cdn.omel.ai/guard.js" 
  data-dealership="SLUG_HERE"
  data-api="https://api.omel.ai">
</script>
```

---

## 📝 Customer Tracking Spreadsheet

Keep a simple spreadsheet:

| Dealership | Slug | Contact Email | Phone | Plan | Start Date | Status |
|------------|------|---------------|-------|------|------------|--------|
| Koons Motors | koons-motors | kymkhw279@gmail.com | (555) 123-4567 | Pro | Dec 6, 2024 | Active |
| Smith Ford | smith-ford | manager@smithford.com | (555) 999-1234 | Starter | - | - |

---

*Last Updated: December 6, 2024*
