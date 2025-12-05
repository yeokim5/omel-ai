# LOMEL AI Development Checklist

Track your progress building LOMEL AI - The Final Safety Layer for Unreliable AI Chatbots.

---

## Phase 1: Script Injection
*Goal: Get guard.js loading on dealership websites*

- [x] Create `guard.js` file
- [x] Add script to dealership site `<head>`
- [x] Confirm script loads (console.log appears)

---

## Phase 2: DOM Detection
*Goal: Find and monitor the chatbot widget on the page*

- [ ] Inspect chatbot widget DOM structure (Gubagoo/Impel)
- [ ] Identify chat container element (class/ID)
- [ ] Identify message list element (where messages appear)
- [ ] Identify input field element (where user types)
- [ ] Create MutationObserver to watch for DOM changes
- [ ] Detect when new messages are added to chat
- [ ] Console log user messages
- [ ] Console log bot responses
- [ ] Differentiate between user vs bot messages

---

## Phase 3: Message Interception
*Goal: Capture bot responses BEFORE customer sees them*

- [ ] Intercept bot response text content
- [ ] Add brief delay/hold on bot messages (100-200ms)
- [ ] Hide message temporarily while evaluating
- [ ] Create queue system for messages awaiting evaluation
- [ ] Handle timeout (show message if API takes too long)

---

## Phase 4: Backend API
*Goal: Build server that evaluates if response is safe*

### 4.1 Server Setup
- [ ] Choose backend framework (Node.js/Express or Python/FastAPI)
- [ ] Initialize project with dependencies
- [ ] Set up basic server structure
- [ ] Configure environment variables (.env)
- [ ] Deploy to hosting (Vercel/Railway/Render)

### 4.2 Evaluation Endpoint
- [ ] Create `/evaluate` POST endpoint
- [ ] Accept payload: `{ message, userMessage, context }`
- [ ] Integrate OpenAI API
- [ ] Write safety evaluation prompt (judge model)
- [ ] Return response: `{ verdict: "pass"|"fail", reason, category }`
- [ ] Add error handling

### 4.3 Database & Logging
- [ ] Choose database (PostgreSQL/MongoDB/Supabase)
- [ ] Create schema for chat logs
- [ ] Store every evaluation (pass and fail)
- [ ] Store dealership ID, timestamp, messages
- [ ] Create schema for blocked threats

### 4.4 Alerts
- [ ] Integrate SMS service (Twilio)
- [ ] Send alert when threat is blocked
- [ ] Include link to conversation in alert

---

## Phase 5: Block & Replace
*Goal: Replace dangerous responses with safe ones*

- [ ] Connect guard.js to backend API
- [ ] Send intercepted messages to `/evaluate`
- [ ] Handle API response in guard.js
- [ ] If `"pass"` → Release message (show to customer)
- [ ] If `"fail"` → Replace message in DOM
- [ ] Create safe response templates by category:
  - [ ] Price promises template
  - [ ] Policy hallucinations template
  - [ ] Rate misquotes template
  - [ ] Absurd requests template
- [ ] Style replaced message to match chatbot UI
- [ ] Test end-to-end flow

---

## Phase 6: Dashboard MVP
*Goal: Show activity to justify $499/month*

### 6.1 Authentication
- [ ] Set up auth system (Supabase Auth / Auth0 / custom)
- [ ] Create login page
- [ ] Create registration flow
- [ ] Link dealerships to their data

### 6.2 Dashboard UI
- [ ] Build dashboard layout
- [ ] Status badge: "SYSTEM ACTIVE" (green pulsing shield)
- [ ] Uptime percentage display
- [ ] Big metric cards:
  - [ ] Chats Scanned (total volume)
  - [ ] Threats Blocked (real blocks)
  - [ ] Security Drills Passed
  - [ ] Potential Liability Saved ($)
- [ ] Activity feed (recent scans/blocks)
- [ ] "Green Wave" graph of messages scanned over time

### 6.3 Features
- [ ] View blocked conversation details
- [ ] Filter by date range
- [ ] Filter by threat category
- [ ] Export compliance report (PDF)

---

## Phase 7: Weekly Security Drills
*Goal: Dashboard is never empty - prove bot is still vulnerable*

- [ ] Create automated drill system
- [ ] Schedule drills (every Monday 9 AM)
- [ ] Write 10+ adversarial test prompts:
  - [ ] "Trade-in for a T-Rex"
  - [ ] "Free unlimited warranties"
  - [ ] "0% APR for anyone"
  - [ ] "Guarantee $8k for my 200k mile car"
  - [ ] etc.
- [ ] Run drills against client's chatbot
- [ ] Log drill results to dashboard
- [ ] Label clearly as "Scheduled Security Drill"

---

## Phase 8: Polish & Launch
*Goal: Production-ready product*

- [ ] Error handling and edge cases
- [ ] Performance optimization (minimize latency)
- [ ] Security audit (API keys, CORS, etc.)
- [ ] Create onboarding flow for new dealerships
- [ ] Write installation documentation
- [ ] Set up billing (Stripe)
- [ ] Create marketing site (lomel.ai)
- [ ] Launch to first pilot customer

---

## Notes

**Current Focus:** Phase 2 - DOM Detection

**Key Files:**
- `www.koonssilverspringford.com/guard.js` - Main client-side script
- `www.koonssilverspringford.com/index.html` - Test dealership page

**Resources:**
- [MutationObserver MDN](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [OpenAI API Docs](https://platform.openai.com/docs)

---

*Last Updated: December 5, 2024*

