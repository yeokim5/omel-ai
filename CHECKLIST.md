# LOMEL AI Development Checklist

Track your progress building LOMEL AI - The Final Safety Layer for Unreliable AI Chatbots.

---

## Product Modes

LOMEL offers two modes for dealerships:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Monitor Mode** | Log all messages, evaluate with AI, report threats. No intervention. | Audit & compliance, see what bot is doing wrong |
| **Protection Mode** | Block dangerous responses, replace with safe message, clear chat, show overlay | Active protection, stop liability |

---

## Phase 1: Script Injection ✅
*Goal: Get guard.js loading on dealership websites*

- [x] Create `guard.js` file
- [x] Add script to dealership site `<head>`
- [x] Confirm script loads (console.log appears)

---

## Phase 2: DOM Detection ✅
*Goal: Find and monitor the chatbot widget on the page*

- [x] Inspect chatbot widget DOM structure (Impel)
- [x] Identify chat container element (`#impel-chatbot`)
- [x] Identify message list element (`._messagesList_hamrg_14`)
- [x] Identify message containers (bot/user)
- [x] Create MutationObserver to watch for DOM changes
- [x] Detect when new messages are added to chat
- [x] Console log user messages
- [x] Console log bot responses
- [x] Differentiate between user vs bot messages

---

## Phase 3: Message Evaluation ✅
*Goal: Evaluate bot responses for safety*

- [x] Capture bot response text content
- [x] Build conversation context (last 20 messages)
- [x] Create evaluation function structure
- [x] Return verdict: pass/fail with reason and category
- [x] Log all evaluations locally

---

## Phase 4: Protection Mode (Client-Side) ✅
*Goal: Block dangerous responses and prevent follow-up*

### 4.1 Message Replacement
- [x] Replace dangerous message content in DOM
- [x] Create safe response templates by category:
  - [x] Price promises template
  - [x] Policy hallucinations template
  - [x] Rate misquotes template
  - [x] Absurd requests template

### 4.2 Input Blocking
- [x] Disable textarea input
- [x] Disable send button
- [x] Update placeholder text

### 4.3 Storage Management
- [x] Clear Impel localStorage
- [x] Clear Impel sessionStorage
- [x] Clear Impel cookies
- [x] Set LOMEL block flag with metadata

### 4.4 Persistent Block (Refresh Protection)
- [x] Check for block flag on page load
- [x] Show block overlay if blocked within 24 hours
- [x] Clear any restored Impel chat history
- [x] "Start Fresh Chat" button to clear block
- [x] Clear all Impel session storage (IC::SESSIONSTORE, SP::SESSIONSTORE)
- [x] Reset internal tracking state on fresh start

### 4.5 Block Overlay UI
- [x] Design overlay with shield icon
- [x] "Chat Session Ended" message
- [x] Dealership phone number (clickable)
- [x] "Start Fresh Chat" button
- [x] "Protected by LOMEL AI" branding

---

## Phase 5: Backend API ✅
*Goal: Build server that evaluates responses using ChatGPT*

### 5.1 Server Setup
- [x] Initialize Node.js/Express project (`backend/`)
- [x] Install dependencies (`express`, `openai`, `cors`, `dotenv`, `uuid`)
- [x] Set up basic server structure
- [x] Configure environment variables (`env.example.txt`)
- [x] Set up CORS for client domains
- [ ] Deploy to hosting (Vercel/Railway/Render)

### 5.2 Evaluation Endpoint
- [x] Create `POST /api/evaluate` endpoint
- [x] Accept payload: `{ dealershipId, botMessage, userMessage, context }`
- [x] Integrate OpenAI ChatGPT API (`gpt-4o-mini`)
- [x] Write safety evaluation system prompt (judge model)
- [x] Define threat categories and detection rules
- [x] Return response: `{ verdict, reason, category, confidence, risk_level }`
- [x] Add error handling (fail open if API error)

### 5.3 Logging Endpoints
- [x] Create `POST /api/log` endpoint
- [x] Create `GET /api/logs` endpoint
- [x] Create `GET /api/blocks` endpoint
- [x] Create `GET /api/stats` endpoint
- [x] In-memory storage (temporary)
- [ ] Replace with Supabase database

### 5.4 Connect Client to Backend
- [x] Update guard.js API endpoint configuration
- [x] Send evaluations to `/api/evaluate`
- [x] Send logs to `/api/log`
- [x] Handle API errors gracefully
- [x] Fallback to keyword detection if API fails

---

## 🚀 How to Run Phase 5

### Step 1: Set up the Backend

```bash
cd backend
npm install
```

### Step 2: Configure Environment

Create a `.env` file in `backend/`:

```
OPENAI_API_KEY=sk-your-api-key-here
PORT=3001
ALLOWED_ORIGINS=*
NODE_ENV=development
```

### Step 3: Start the Server

```bash
npm start
```

You should see:
```
========================================
   LOMEL AI - Backend API Server
========================================
   Port: 3001
   OpenAI Key: ✓ Configured
========================================
```

### Step 4: Test the API

```bash
curl -X POST http://localhost:3001/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"botMessage": "Sure, I guarantee $8000 for your trade-in!", "userMessage": "Can you guarantee a price?"}'
```

Expected response:
```json
{
  "verdict": "fail",
  "reason": "Contains specific price guarantee for trade-in",
  "category": "price_promise",
  "confidence": 0.95,
  "risk_level": "high"
}
```

### Step 5: Open the Dealership Page

Open `www.koonssilverspringford.com/index.html` in browser with the backend running.

---

## Phase 6: Dashboard MVP
*Goal: Show activity and alerts to justify $499/month*

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js App (App Router)                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │  │
│  │  │  Dashboard  │  │  API Routes │  │  Supabase    │   │  │
│  │  │   (React)   │  │  /api/*     │  │   Client     │   │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   Auth   │  │ Postgres │  │ Real-time│  │ Storage  │    │
│  │ (built-in)│  │    DB    │  │   Logs   │  │ (if need)│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 6.1 Supabase Setup
- [x] Create Supabase project at supabase.com
- [x] Get project URL and anon key
- [ ] Create database tables:
  - [ ] `dealerships` (id, name, slug, plan, settings, created_at)
  - [ ] `users` (id, email, dealership_id, role, created_at)
  - [ ] `guard_logs` (id, dealership_id, type, bot_message, user_message, verdict, reason, created_at)
  - [ ] `configurations` (id, dealership_id, mode, safe_response, phone, updated_at)
- [ ] Set up Row Level Security (RLS) policies
- [x] Enable Supabase Auth (Email/Password)
- [ ] Optional: Add Microsoft/Google OAuth

### 6.2 Next.js Dashboard Setup ✅
- [x] Create Next.js app: `npx create-next-app@latest dashboard --typescript --tailwind --app`
- [x] Install Supabase: `npm install @supabase/supabase-js @supabase/ssr`
- [x] Configure Supabase client (client.ts, server.ts, middleware.ts)
- [x] Set up environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] Deploy to Vercel

### 6.3 Authentication ✅
- [x] Create login page (email/password)
- [x] Create registration flow
- [ ] Add "Forgot Password" functionality
- [ ] Optional: Add Microsoft OAuth (many dealerships use Outlook)
- [ ] Optional: Add Google OAuth
- [x] Protect dashboard routes with middleware
- [ ] Link users to their dealership

### 6.4 Dashboard Home ✅ (UI Complete - Needs Real Data)
- [x] Build dashboard layout (sidebar + main content)
- [x] Status badge: "SYSTEM ACTIVE" (green pulsing shield)
- [x] Mode toggle: Monitor / Protection (in settings)
- [x] Big metric cards (mock data):
  - [x] Chats Scanned (total volume)
  - [x] Threats Blocked (protection mode)
  - [x] Threats Detected (monitor mode)
  - [x] Security Drills Passed
- [x] Activity feed (mock data)
- [ ] Connect to real Supabase data
- [ ] "Green Wave" graph of messages scanned over time
- [ ] Real-time updates using Supabase Realtime

### 6.5 Alert Log ✅ (UI Complete - Needs Real Data)
- [x] Create alerts/notifications page
- [x] List all blocked/detected threats with details
- [x] Show: timestamp, original message, category, reason
- [ ] Connect to real Supabase data
- [ ] Expandable to see full conversation context
- [ ] Mark alerts as reviewed
- [ ] Filter by date, category, severity

### 6.6 Settings ✅ (UI Complete - Needs Real Data)
- [x] Update dealership info (name, phone) - UI done
- [x] Switch between Monitor/Protection mode - UI done
- [ ] Connect to real Supabase data
- [ ] Customize safe response templates
- [ ] Email report preferences (daily/weekly/none)
- [ ] Manage team members (invite/remove)

### 6.7 Email Reports
- [ ] Set up email service (Resend)
- [ ] Create daily digest email template
- [ ] Create weekly summary email template
- [ ] Schedule automated email sends (Vercel Cron or Supabase Edge Functions)
- [ ] Include: threats blocked, chats scanned, drill results

### 6.8 Compliance Report
- [ ] Generate PDF compliance report
- [ ] Include monthly stats and blocked threats
- [ ] Professional formatting for legal/management

### 6.9 Update Backend API
- [ ] Migrate from in-memory storage to Supabase
- [ ] Update `/api/log` to write to Supabase
- [ ] Update `/api/evaluate` to log results to Supabase
- [ ] Add dealership authentication to API

---

## 🚀 How to Run Phase 6

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings > API and copy:
   - Project URL
   - `anon` public key
3. Go to SQL Editor and run the database schema (see Tech Stack section)

### Step 2: Create Next.js Dashboard

```bash
cd "Lomel AI"
npx create-next-app@latest dashboard --typescript --tailwind --app --eslint
cd dashboard
npm install @supabase/supabase-js @supabase/ssr
```

### Step 3: Configure Environment

Create `dashboard/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Run Dashboard Locally

```bash
cd dashboard
npm run dev
```

Open http://localhost:3000

### Step 5: Deploy to Vercel

```bash
cd dashboard
npx vercel
```

Or connect GitHub repo to Vercel for auto-deploy.

---

## Phase 7: Weekly Security Drills
*Goal: Dashboard is never empty - prove bot is still vulnerable*

- [ ] Create drill runner script
- [ ] Schedule drills (cron job - every Monday 9 AM)
- [ ] Write 10+ adversarial test prompts
- [ ] Run drills against client's chatbot
- [ ] Log drill results to database
- [ ] Display in dashboard as "Scheduled Security Drill"
- [ ] Include drill results in weekly email report

---

## Phase 8: Polish & Launch
*Goal: Production-ready product*

- [ ] Error handling and edge cases
- [ ] Performance optimization (minimize latency)
- [ ] Security audit (API keys, CORS, etc.)
- [ ] Create onboarding flow for new dealerships
- [ ] Write installation documentation (one-line script)
- [ ] Set up billing (Stripe)
- [ ] Create marketing site (lomel.ai)
- [ ] Launch to first pilot customer

---

## Tech Stack Summary

| Component | Technology | Status |
|-----------|------------|--------|
| Client Script | Vanilla JavaScript (`guard.js`) | ✅ Done |
| Backend API | Node.js + Express | ✅ Done |
| AI Evaluation | OpenAI ChatGPT API (`gpt-4o-mini`) | ✅ Done |
| Database | Supabase PostgreSQL | 🟡 Tables needed |
| Auth | Supabase Auth (Email + OAuth) | ✅ Done (Email) |
| Dashboard | Next.js 15 (App Router) + Tailwind CSS | ✅ UI Done |
| Real-time Updates | Supabase Realtime | 🔲 TODO |
| Email Reports | Resend | 🔲 TODO |
| Frontend Hosting | Vercel | 🔲 TODO |
| Backend Hosting | Vercel (or Railway) | 🔲 TODO |

### Cost Estimate (Starting)

| Service | Cost |
|---------|------|
| Vercel | Free (hobby) → $20/mo (pro) |
| Supabase | Free (500MB, 50K MAU) → $25/mo (pro) |
| OpenAI API | ~$5-20/mo (usage-based) |
| Resend | Free (100 emails/day) → $20/mo |
| **Total** | **~$5-65/mo** to start |

### Database Schema

```sql
-- Dealerships (your customers)
CREATE TABLE dealerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'starter',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users (dealership staff)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  dealership_id UUID REFERENCES dealerships(id),
  role VARCHAR(50) DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Guard Logs (from guard.js)
CREATE TABLE guard_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id),
  type VARCHAR(50) NOT NULL,
  bot_message TEXT,
  user_message TEXT,
  verdict VARCHAR(20),
  reason TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Configurations
CREATE TABLE configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id) UNIQUE,
  mode VARCHAR(20) DEFAULT 'protection',
  safe_response TEXT,
  phone VARCHAR(20),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## File Structure

```
Lomel AI/
├── backend/
│   ├── package.json
│   ├── server.js          # Express API server
│   ├── env.example.txt    # Environment template
│   └── .gitignore
├── dashboard/             # Next.js Dashboard ✅
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # Redirects to login/dashboard
│   │   │   ├── login/
│   │   │   │   └── page.tsx   # Login & signup page
│   │   │   ├── auth/
│   │   │   │   └── callback/route.ts  # OAuth callback
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx # Dashboard layout + sidebar
│   │   │       ├── page.tsx   # Dashboard home
│   │   │       ├── alerts/page.tsx    # Alert log
│   │   │       └── settings/page.tsx  # Settings page
│   │   ├── components/
│   │   │   └── Sidebar.tsx    # Navigation sidebar
│   │   ├── lib/supabase/
│   │   │   ├── client.ts      # Browser Supabase client
│   │   │   ├── server.ts      # Server Supabase client
│   │   │   └── middleware.ts  # Auth middleware helper
│   │   └── middleware.ts      # Route protection
│   ├── package.json
│   └── .env.local             # Supabase keys (not in git)
├── www.koonssilverspringford.com/
│   ├── index.html         # Test dealership page
│   └── guard.js           # Client-side script v2.2
├── CHECKLIST.md           # This file
├── readme.md              # Development notes
└── vision.md              # Product vision
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/evaluate` | Evaluate bot message with ChatGPT |
| POST | `/api/log` | Log chat events |
| GET | `/api/logs` | Get chat logs |
| GET | `/api/blocks` | Get blocked events |
| GET | `/api/stats` | Get statistics |
| GET | `/api/health` | Health check |

---

## Debug Commands (Browser Console)

```javascript
LOMEL.getLogs()           // View local logs
LOMEL.clearBlock()        // Clear block and refresh
LOMEL.getConfig()         // View settings
LOMEL.setMode('monitor')  // Switch to monitor mode
LOMEL.setMode('protection') // Switch to protection mode
LOMEL.testEvaluate("I guarantee $8000") // Test evaluation
```

---

## Notes

**Current Focus:** Phase 6 - Dashboard MVP (Connecting to Real Data)

**What's Done:**
- ✅ Next.js dashboard created and running
- ✅ Supabase project created with auth enabled
- ✅ Login/signup pages working
- ✅ Dashboard UI complete (home, alerts, settings)
- ✅ Protected routes with middleware

**Next Steps:**
1. Create database tables in Supabase (run SQL schema)
2. Connect dashboard to real Supabase data
3. Update backend API to write logs to Supabase
4. Add real-time updates to dashboard
5. Deploy to Vercel

**Impel DOM Selectors:**
- Container: `#impel-chatbot`
- Messages: `._messagesList_hamrg_14`
- Bot messages: `._assistantMessageContainer_ricj1_1`
- User messages: `._userMessageContainer_1e59u_1`
- Message text: `._messageText_frcys_28`
- Input: `._inputText_ti1lk_18`
- Send button: `._sendButton_ti1lk_41`

---

*Last Updated: December 6, 2024*
