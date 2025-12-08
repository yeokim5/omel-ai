/**
 * ============================================================
 * Omel AI - Backend API Server
 * ============================================================
 * 
 * This is the main API server that powers guard.js functionality.
 * It evaluates chatbot messages for safety using OpenAI GPT-4.
 * 
 * ENDPOINTS:
 * - GET  /api/health        - Health check
 * - GET  /api/config/:slug  - Get dealership config
 * - POST /api/evaluate      - Evaluate a bot message for safety
 * - POST /api/log           - Log chat events to Supabase
 * - GET  /api/logs          - Get logs (for debugging)
 * 
 * ENVIRONMENT VARIABLES (see env.example.txt):
 * - PORT                    - Server port (default: 3001)
 * - OPENAI_API_KEY          - OpenAI API key (required)
 * - SUPABASE_URL            - Supabase project URL (optional)
 * - SUPABASE_SERVICE_KEY    - Supabase service role key (optional)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());
app.use(cors());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// EXTERNAL SERVICE CLIENTS
// ============================================================

// OpenAI client for message evaluation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Supabase client (optional - falls back to in-memory if not configured)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  console.log('[SUPABASE] Connected');
} else {
  console.log('[SUPABASE] Not configured - using in-memory storage');
}

// In-memory fallback storage (used when Supabase is not configured)
const memoryLogs = [];
const dealershipCache = {};

// ============================================================
// SAFETY EVALUATION PROMPT
// ============================================================

/**
 * This prompt instructs GPT-4 to evaluate chatbot responses.
 * It's designed to catch risky promises that could create legal liability.
 */
const SYSTEM_PROMPT = `You are a safety evaluator for car dealership chatbots.

Your job is simple: Determine if a chatbot response could create legal liability for the dealership.

ASK YOURSELF: "If a customer relied on this response and it turned out to be wrong, could the dealership get sued or face complaints?"

FLAG AS DANGEROUS IF:
- Specific prices, trade-in values, or payment amounts are promised
- Policies or benefits are stated that may not exist
- Financing rates or terms are quoted without disclaimers
- The bot agrees to something that requires human approval
- Any commitment a lawyer would consider risky
- The response seems too good to be true
- Specific guarantees or promises are made

SAFE RESPONSES USUALLY:
- Redirect to speak with staff in person
- Say "it depends" or "we'd need to evaluate"
- Avoid specific numbers
- Use words like "typically", "may", "could"
- Suggest visiting or calling the dealership

RESPOND WITH JSON ONLY:
{
  "safe": true or false,
  "reason": "One sentence explanation"
}

RULE: When in doubt, mark it unsafe. False positives are better than lawsuits.`;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get dealership by slug with caching
 * @param {string} slug - Dealership slug (URL-friendly identifier)
 * @returns {Object|null} Dealership data or null if not found
 */
async function getDealershipBySlug(slug) {
  // Check cache first
  if (dealershipCache[slug]) {
    return dealershipCache[slug];
  }

  if (!supabase) return null;

  // Use maybeSingle() instead of single() to gracefully handle missing dealerships
  // single() throws PGRST116 error if no row exists, causing unhandled exceptions
  const { data, error } = await supabase
    .from('dealerships')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[getDealershipBySlug] Error:', error.message);
    return null;
  }

  if (data) {
    dealershipCache[slug] = data;
  }

  return data || null;
}

/**
 * Get full dealership configuration (name, mode, safe response, phone)
 * @param {string} slug - Dealership slug
 * @returns {Object|null} Configuration object or null
 */
async function getDealershipConfig(slug) {
  if (!supabase) return null;

  const dealership = await getDealershipBySlug(slug);
  if (!dealership) return null;

  // Use maybeSingle() instead of single() to gracefully handle missing configurations
  // single() throws PGRST116 error if no row exists, crashing the endpoint
  const { data: config } = await supabase
    .from('configurations')
    .select('mode, safe_response, phone')
    .eq('dealership_id', dealership.id)
    .maybeSingle();

  return {
    id: dealership.id,
    name: dealership.name,
    slug: dealership.slug,
    mode: config?.mode || 'protection',
    safeResponse: config?.safe_response,
    phone: config?.phone
  };
}

// ============================================================
// API ENDPOINTS
// ============================================================

/**
 * Health Check
 * Returns server status and connection info
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    supabase: !!supabase,
    timestamp: new Date().toISOString() 
  });
});

/**
 * Get Dealership Config
 * Returns configuration for guard.js to use
 */
app.get('/api/config/:slug', async (req, res) => {
  const { slug } = req.params;
  
  const config = await getDealershipConfig(slug);
  
  if (config) {
    res.json(config);
  } else {
    // Return defaults if dealership not found
    res.json({
      name: 'Unknown Dealership',
      mode: 'protection',
      phone: '(555) 123-4567'
    });
  }
});

/**
 * Evaluate Message
 * Uses OpenAI GPT-4 to determine if a bot response is safe
 */
app.post('/api/evaluate', async (req, res) => {
  const { dealershipId, botMessage, userMessage } = req.body;

  if (!botMessage) {
    return res.status(400).json({ error: 'botMessage is required' });
  }

  console.log(`[EVALUATE] Dealership: ${dealershipId}`);
  console.log(`[EVALUATE] Bot: "${botMessage.substring(0, 50)}..."`);

  try {
    // Call OpenAI for evaluation
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `USER ASKED: "${userMessage || 'N/A'}"\n\nBOT RESPONDED: "${botMessage}"\n\nIs this response safe?` }
      ],
      temperature: 0.1,  // Low temperature for consistent results
      max_tokens: 100,
      response_format: { type: 'json_object' }
    });

    // Parse the response
    let result;
    try {
      // Validate that choices array exists and has at least one element
      // OpenAI may return empty choices array in edge cases
      if (!completion.choices || completion.choices.length === 0) {
        console.warn('[EVALUATE] OpenAI returned empty choices array');
        result = { safe: true, reason: 'Empty API response, defaulting to safe' };
      } else if (!completion.choices[0].message || !completion.choices[0].message.content) {
        console.warn('[EVALUATE] OpenAI response missing message content');
        result = { safe: true, reason: 'Missing message content, defaulting to safe' };
      } else {
        const parsed = JSON.parse(completion.choices[0].message.content);
        
        // Validate that the response has the required properties
        // This prevents false positives when OpenAI returns unexpected JSON structure
        if (typeof parsed.safe !== 'boolean') {
          console.warn('[EVALUATE] Response missing "safe" boolean, defaulting to safe');
          result = { safe: true, reason: 'Invalid response structure, defaulting to safe' };
        } else {
          result = {
            safe: parsed.safe,
            reason: typeof parsed.reason === 'string' ? parsed.reason : 'No reason provided'
          };
        }
      }
    } catch (e) {
      result = { safe: true, reason: 'Failed to parse, defaulting to safe' };
    }

    console.log(`[EVALUATE] Result: ${result.safe ? 'SAFE ✓' : 'UNSAFE ✗'} - ${result.reason}`);

    res.json(result);

  } catch (error) {
    console.error('[EVALUATE] Error:', error.message);
    // Default to safe on error to avoid blocking legitimate messages
    res.json({ safe: true, reason: 'API error, defaulting to safe' });
  }
});

/**
 * Log Event
 * Saves chat events to Supabase or in-memory storage
 */
app.post('/api/log', async (req, res) => {
  const { dealershipId, type, botMessage, userMessage, reason } = req.body;

  console.log(`[LOG] ${type} from ${dealershipId}`);

  // Try to save to Supabase
  if (supabase && dealershipId) {
    try {
      const dealership = await getDealershipBySlug(dealershipId);
      
      if (dealership) {
        await supabase.from('guard_logs').insert({
          dealership_id: dealership.id,
          type: type || 'evaluation',
          bot_message: botMessage,
          user_message: userMessage,
          reason: reason
        });
        console.log(`[LOG] Saved to Supabase for ${dealership.name}`);
      } else {
        console.log(`[LOG] Dealership not found: ${dealershipId}`);
        // Save to memory as fallback
        memoryLogs.push({ dealershipId, type, botMessage, userMessage, reason, timestamp: new Date() });
      }
    } catch (error) {
      console.error('[LOG] Supabase error:', error.message);
      memoryLogs.push({ dealershipId, type, botMessage, userMessage, reason, timestamp: new Date() });
    }
  } else {
    // Save to memory
    memoryLogs.push({ dealershipId, type, botMessage, userMessage, reason, timestamp: new Date() });
  }

  res.json({ success: true });
});

/**
 * Get Logs (Debug)
 * Returns recent logs for a dealership
 */
app.get('/api/logs', async (req, res) => {
  const { dealershipId } = req.query;
  
  if (supabase && dealershipId) {
    const dealership = await getDealershipBySlug(dealershipId);
    if (dealership) {
      const { data } = await supabase
        .from('guard_logs')
        .select('*')
        .eq('dealership_id', dealership.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return res.json({ total: data?.length || 0, logs: data || [] });
    }
  }

  // Fallback to memory logs
  let logs = memoryLogs;
  if (dealershipId) {
    logs = logs.filter(l => l.dealershipId === dealershipId);
  }
  res.json({ total: logs.length, logs: logs.slice(-100) });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('   Omel AI - Backend API');
  console.log('========================================');
  console.log(`   Port: ${PORT}`);
  console.log(`   OpenAI: ${process.env.OPENAI_API_KEY ? '✓ Ready' : '✗ Missing!'}`);
  console.log(`   Supabase: ${supabase ? '✓ Connected' : '○ Not configured'}`);
  console.log('========================================');
  console.log('');
});
