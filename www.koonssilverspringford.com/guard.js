/**
 * ============================================================
 * Omel AI - Guard.js
 * The Final Safety Layer for AI Chatbots
 * ============================================================
 * 
 * This script monitors chatbot responses and blocks unsafe messages
 * that could create legal liability for dealerships.
 * 
 * INSTALLATION (add to dealership website <head>):
 * 
 *   <script 
 *     src="/guard.js" 
 *     data-dealership="YOUR_DEALERSHIP_SLUG"
 *     data-api="https://omel-ai-production.up.railway.app">
 *   </script>
 * 
 * LOCAL TESTING:
 * 
 *   <script 
 *     src="/guard.js" 
 *     data-dealership="koons-motors"
 *     data-api="http://localhost:3001">
 *   </script>
 * 
 * CONFIGURATION ATTRIBUTES:
 * - data-dealership: Unique identifier for this dealership (required)
 * - data-api: Backend API URL (default: http://localhost:3001)
 * - data-mode: 'protection' (block) or 'monitor' (log only)
 */

// Immediate log to confirm script is loading
console.log('[OMEL] 📜 Script file loaded at', new Date().toISOString());

// Global heartbeat - logs every 30 seconds to confirm script is still active
if (!window.__OMEL_HEARTBEAT__) {
  window.__OMEL_HEARTBEAT__ = setInterval(() => {
    const chatbot = document.querySelector('#impel-chatbot');
    const messagesList = chatbot?.querySelector('._messagesList_hamrg_14') || 
                         chatbot?.querySelector('[class*="messagesList"]') ||
                         chatbot?.querySelector('[class*="messages"]');
    const chatbotStatus = chatbot ? '✅' : '❌';
    const messagesStatus = messagesList ? '✅' : '❌';
    console.log(`[OMEL] 💓 Heartbeat: Chatbot ${chatbotStatus}, Messages ${messagesStatus}, initialized: ${!!window.__OMEL_INITIALIZED__}`);
  }, 30000); // Every 30 seconds
}

(function() {
  'use strict';
  
  // Prevent double initialization (important for SPA navigation)
  if (window.__OMEL_INITIALIZED__) {
    console.log('[OMEL] ⚠️ Already initialized, skipping duplicate');
    // Still expose debug API even on duplicate load
    exposeDebugAPI();
    return;
  }
  window.__OMEL_INITIALIZED__ = true;

  // ============================================================
  // CONFIGURATION
  // ============================================================
  
  // Get configuration from script tag attributes
  const scriptTag = document.currentScript || document.querySelector('script[data-dealership]');
  
  const CONFIG = {
    // Dealership identifier (used for logging and config lookup)
    dealershipId: scriptTag?.getAttribute('data-dealership') || 'demo-dealership',
    
    // Backend API URL
    apiBase: scriptTag?.getAttribute('data-api') || 'https://omel-ai-production.up.railway.app',
    
    // Operating mode: 'protection' = block unsafe, 'monitor' = log only
    mode: scriptTag?.getAttribute('data-mode') || 'protection',
    
    // API timeout in milliseconds
    apiTimeout: 5000,
    
    // Impel chatbot DOM selectors (with fallbacks)
    chatbotSelector: '#impel-chatbot',
    messagesListSelectors: [
      '._messagesList_hamrg_14',
      '[class*="messagesList"]',
      '[class*="messages_"]',
      '[class*="chatMessages"]'
    ],
    botMessageSelectors: [
      '._assistantMessageContainer_ricj1_1',
      '[class*="assistantMessage"]',
      '[class*="botMessage"]'
    ],
    userMessageSelectors: [
      '._userMessageContainer_1e59u_1',
      '[class*="userMessage"]'
    ],
    messageTextSelector: '._messageText_frcys_28',
    inputSelector: '._inputText_ti1lk_18',
    sendButtonSelector: '._sendButton_ti1lk_41',
    chatWindowSelector: '._chatWindow_18och_19',
    
    // Timing configuration
    checkInterval: 500,      // How often to check for chatbot (ms)
    maxRetries: 120,         // Max attempts to find chatbot (60 seconds)
    recheckInterval: 5000,   // Recheck every 5 seconds after initial search
    blockDuration: 24 * 60 * 60 * 1000, // How long to persist block (24 hours)
    
    // LocalStorage keys (namespaced by dealership)
    get storageKeyBlock() { return `omel_${this.dealershipId}_blocked` },
    get storageKeyLogs() { return `omel_${this.dealershipId}_logs` },
    
    // Default safe response (replaced by server config)
    safeResponse: `For accurate information on this topic, please speak with our team directly. They'll provide you with precise details based on your specific situation.`,
    dealershipPhone: '(555) 123-4567',
    dealershipName: 'Our Dealership',
  };

  // Build API endpoint URLs
  CONFIG.apiEndpoint = `${CONFIG.apiBase}/api/evaluate`;
  CONFIG.logEndpoint = `${CONFIG.apiBase}/api/log`;
  CONFIG.configEndpoint = `${CONFIG.apiBase}/api/config/${CONFIG.dealershipId}`;

  // State tracking
  const processedMessages = new Set();  // Track already-processed messages
  let conversationContext = [];          // Recent conversation history
  let userHasInteracted = false;         // Only scan after user sends first message

  /**
   * Generate a simple hash string from text for unique message identification
   * Uses djb2 algorithm - fast and provides good distribution
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return 'msg_' + Math.abs(hash).toString(36);
  }

  // Log initialization
  console.log(`[OMEL] 🚀 Guard.js loaded for: ${CONFIG.dealershipId}`);
  console.log(`[OMEL] Mode: ${CONFIG.mode}`);
  console.log(`[OMEL] API: ${CONFIG.apiBase}`);
  console.log(`[OMEL] Looking for chatbot... (will keep trying for 60s, then recheck every 5s)`);

  // ============================================================
  // SERVER CONFIG FETCH
  // ============================================================
  
  /**
   * Fetch dealership configuration from the backend
   * Updates CONFIG with server-provided values
   */
  async function fetchDealershipConfig() {
    console.log(`[OMEL] 📡 Fetching config from: ${CONFIG.configEndpoint}`);
    try {
      const response = await fetch(CONFIG.configEndpoint);
      if (response.ok) {
        const data = await response.json();
        if (data.safeResponse) CONFIG.safeResponse = data.safeResponse;
        if (data.phone) CONFIG.dealershipPhone = data.phone;
        if (data.name) CONFIG.dealershipName = data.name;
        if (data.mode) CONFIG.mode = data.mode;
        console.log(`[OMEL] ✅ Config loaded for ${data.name || CONFIG.dealershipId}`);
      } else {
        console.log(`[OMEL] ⚠️ Config API returned ${response.status}, using defaults`);
      }
    } catch (e) {
      console.log(`[OMEL] ❌ Config API error: ${e.message}, using defaults`);
    }
  }

  // ============================================================
  // LOCAL STORAGE MANAGEMENT
  // ============================================================

  /**
   * Clear all Impel chatbot storage to reset the conversation
   */
  function clearImpelStorage() {
    // Clear localStorage and sessionStorage items related to Impel
    ['localStorage', 'sessionStorage'].forEach(storage => {
      Object.keys(window[storage]).forEach(key => {
        if (key.toLowerCase().includes('impel') || key.toLowerCase().includes('chat')) {
          window[storage].removeItem(key);
        }
      });
    });
    
    // Clear Impel session identifiers
    localStorage.removeItem('IC::SESSIONSTORE');
    localStorage.removeItem('SP::SESSIONSTORE');
    sessionStorage.removeItem('IC::SESSIONSTORE');
    sessionStorage.removeItem('SP::SESSIONSTORE');
    
    // Clear Impel cookies
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (name.toLowerCase().includes('impel')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
  }

  /**
   * Set the block flag in localStorage
   * @param {string} reason - Why the message was blocked
   * @param {string} originalMessage - The original blocked message
   */
  function setBlockFlag(reason, originalMessage) {
    localStorage.setItem(CONFIG.storageKeyBlock, JSON.stringify({
      blocked: true,
      timestamp: Date.now(),
      reason,
      originalMessage
    }));
  }

  /**
   * Check if there's an active block flag
   * @returns {Object|null} Block data or null if not blocked
   */
  function checkBlockFlag() {
    const data = localStorage.getItem(CONFIG.storageKeyBlock);
    if (!data) return null;
    
    try {
      const parsed = JSON.parse(data);
      // Check if block has expired
      if (Date.now() - parsed.timestamp > CONFIG.blockDuration) {
        localStorage.removeItem(CONFIG.storageKeyBlock);
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  /**
   * Clear block flag and reset all state, then reload
   */
  function clearBlockFlag() {
    localStorage.removeItem(CONFIG.storageKeyBlock);
    localStorage.removeItem(CONFIG.storageKeyLogs);
    localStorage.removeItem('IC::SESSIONSTORE');
    localStorage.removeItem('SP::SESSIONSTORE');
    sessionStorage.removeItem('IC::SESSIONSTORE');
    sessionStorage.removeItem('SP::SESSIONSTORE');
    clearImpelStorage();
    processedMessages.clear();
    conversationContext = [];
    userHasInteracted = false;
    window.location.reload();
  }

  // ============================================================
  // UI COMPONENTS
  // ============================================================

  /**
   * Sanitize text content to prevent XSS when inserting into DOM
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text safe for display
   */
  function sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Sanitize phone number for tel: links (only allow digits, +, -, (, ), spaces)
   * @param {string} phone - Phone number to sanitize
   * @returns {string} Sanitized phone number
   */
  function sanitizePhone(phone) {
    return phone.replace(/[^\d+\-() ]/g, '');
  }

  /**
   * Show the block overlay when chat is terminated
   * Uses DOM API instead of innerHTML to prevent XSS from backend data
   */
  function showBlockOverlay() {
    const chatbot = document.querySelector(CONFIG.chatbotSelector);
    if (!chatbot) return;
    
    // Remove any existing overlay to prevent duplicates
    // This handles cases where showBlockOverlay is called multiple times
    const existingOverlay = document.getElementById('omel-block-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'omel-block-overlay';
    
    // Create inner container with styles
    const innerDiv = document.createElement('div');
    innerDiv.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      border-radius: 12px;
    `;
    
    // Shield icon
    const shieldIcon = document.createElement('div');
    shieldIcon.style.cssText = 'font-size: 48px; margin-bottom: 16px;';
    shieldIcon.textContent = '🛡️';
    innerDiv.appendChild(shieldIcon);
    
    // Heading
    const heading = document.createElement('h2');
    heading.style.cssText = 'font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0;';
    heading.textContent = 'Chat Session Ended';
    innerDiv.appendChild(heading);
    
    // Description paragraph - use two separate text nodes with a line break element
    // Avoids innerHTML for consistency with security pattern throughout the codebase
    const desc = document.createElement('p');
    desc.style.cssText = 'font-size: 14px; color: #666; margin: 0 0 20px 0; line-height: 1.5;';
    desc.appendChild(document.createTextNode('Your conversation was ended to protect you'));
    desc.appendChild(document.createElement('br'));
    desc.appendChild(document.createTextNode('from inaccurate information.'));
    innerDiv.appendChild(desc);
    
    // CTA text
    const ctaText = document.createElement('p');
    ctaText.style.cssText = 'font-size: 14px; color: #333; margin: 0 0 8px 0;';
    ctaText.textContent = 'For accurate information:';
    innerDiv.appendChild(ctaText);
    
    // Phone link - sanitized to prevent XSS
    const phoneLink = document.createElement('a');
    const sanitizedPhone = sanitizePhone(CONFIG.dealershipPhone);
    phoneLink.href = 'tel:' + sanitizedPhone;
    phoneLink.style.cssText = 'font-size: 24px; font-weight: 700; color: #015FEA; text-decoration: none; margin: 8px 0 24px 0;';
    phoneLink.textContent = '📞 ' + sanitizedPhone;
    innerDiv.appendChild(phoneLink);
    
    // Start Fresh button
    const freshBtn = document.createElement('button');
    freshBtn.id = 'omel-start-fresh';
    freshBtn.style.cssText = 'background: #f0f0f0; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; color: #333; cursor: pointer;';
    freshBtn.textContent = 'Start Fresh Chat';
    freshBtn.addEventListener('click', clearBlockFlag);
    innerDiv.appendChild(freshBtn);
    
    // Footer
    const footer = document.createElement('p');
    footer.style.cssText = 'font-size: 11px; color: #999; margin-top: 20px;';
    footer.textContent = 'Protected by Omel AI';
    innerDiv.appendChild(footer);
    
    overlay.appendChild(innerDiv);
    
    const chatWindow = chatbot.querySelector(CONFIG.chatWindowSelector) || chatbot;
    chatWindow.style.position = 'relative';
    chatWindow.appendChild(overlay);
  }

  /**
   * Disable the chat input to prevent further messages
   */
  function disableChatInput() {
    const input = document.querySelector(CONFIG.inputSelector);
    const btn = document.querySelector(CONFIG.sendButtonSelector);
    
    if (input) {
      input.disabled = true;
      input.placeholder = 'Chat ended - Please call us';
      input.style.background = '#f5f5f5';
    }
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    }
  }

  /**
   * Replace a message's text with the safe response
   * Uses DOM API instead of innerHTML to prevent XSS from backend data
   * @param {Element} messageElement - The message DOM element
   * @param {string} newText - The replacement text
   */
  function replaceMessage(messageElement, newText) {
    const textEl = messageElement.querySelector(CONFIG.messageTextSelector);
    if (textEl) {
      const article = textEl.querySelector('article');
      if (article) {
        // Clear existing content and create new paragraph safely
        article.textContent = '';
        const p = document.createElement('p');
        p.textContent = newText;
        article.appendChild(p);
      } else {
        textEl.textContent = newText;
      }
    }
  }

  // ============================================================
  // BLOCKING LOGIC
  // ============================================================

  /**
   * Execute a block: replace message, disable input, show overlay
   * @param {Element} messageElement - The message element to replace
   * @param {string} originalMessage - The original unsafe message
   * @param {string} reason - Why it was blocked
   */
  function executeBlock(messageElement, originalMessage, reason) {
    console.log('[OMEL] 🚨 BLOCKING:', reason);
    
    replaceMessage(messageElement, CONFIG.safeResponse);
    disableChatInput();
    clearImpelStorage();
    setBlockFlag(reason, originalMessage);
    showBlockOverlay();
  }

  // ============================================================
  // API COMMUNICATION
  // ============================================================

  /**
   * Send message to backend for safety evaluation
   * @param {string} botMessage - The bot's response to evaluate
   * @param {string} userMessage - What the user asked
   * @returns {Object} Evaluation result with safe (boolean) and reason (string)
   */
  async function evaluateMessage(botMessage, userMessage) {
    console.log('[OMEL] Evaluating...');
    
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), CONFIG.apiTimeout);
      
      const response = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealershipId: CONFIG.dealershipId,
          botMessage,
          userMessage
        }),
        signal: controller.signal
      });
      
      if (!response.ok) throw new Error('API error');
      
      const result = await response.json();
      
      // Validate response structure to prevent false positives from malformed responses
      // If 'safe' is not a boolean, default to safe to avoid blocking legitimate messages
      if (typeof result.safe !== 'boolean') {
        console.warn('[OMEL] Invalid response structure, defaulting to safe');
        return { safe: true, reason: 'Invalid response structure' };
      }
      
      console.log(`[OMEL] Result: ${result.safe ? 'SAFE ✓' : 'UNSAFE ✗'}`);
      return {
        safe: result.safe,
        reason: typeof result.reason === 'string' ? result.reason : 'No reason provided'
      };
      
    } catch (error) {
      console.warn('[OMEL] API failed, using fallback');
      return fallbackCheck(botMessage);
    }
  }

  /**
   * Fallback keyword-based safety check when API is unavailable
   * @param {string} text - Message text to check
   * @returns {Object} Evaluation result
   */
  function fallbackCheck(text) {
    const riskyPatterns = [
      /guarantee/i,
      /promise/i,
      /\$\d{1,3},?\d{3}/,       // Dollar amounts
      /0%\s*apr/i,               // 0% APR offers
      /free.{0,15}(lifetime|unlimited)/i,
      /will\s+match/i
    ];
    
    for (const pattern of riskyPatterns) {
      if (pattern.test(text)) {
        return { safe: false, reason: 'Risky keyword detected' };
      }
    }
    return { safe: true, reason: 'No risky keywords' };
  }

  /**
   * Log event to backend server
   * @param {Object} data - Log data to send
   */
  async function logToServer(data) {
    try {
      await fetch(CONFIG.logEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealershipId: CONFIG.dealershipId,
          ...data
        })
      });
    } catch (e) {
      // Silent fail - logging shouldn't block functionality
    }
    
    // Also save to localStorage as backup
    const logs = JSON.parse(localStorage.getItem(CONFIG.storageKeyLogs) || '[]');
    logs.push({ ...data, timestamp: Date.now() });
    localStorage.setItem(CONFIG.storageKeyLogs, JSON.stringify(logs.slice(-100)));
  }

  // ============================================================
  // MESSAGE PROCESSING
  // ============================================================

  /**
   * Extract text content from a message element
   * @param {Element} el - Message DOM element
   * @returns {string|null} Message text or null
   */
  function getMessageText(el) {
    const textEl = el.querySelector(CONFIG.messageTextSelector);
    if (!textEl) return null;
    const p = textEl.querySelector('article p');
    return p ? p.textContent.trim() : textEl.textContent.trim();
  }

  /**
   * Get the most recent user message from conversation context
   * @returns {string} Last user message or empty string
   */
  function getLastUserMessage() {
    for (let i = conversationContext.length - 1; i >= 0; i--) {
      if (conversationContext[i].type === 'user') return conversationContext[i].text;
    }
    return '';
  }

  /**
   * Process a message element (user or bot)
   * @param {Element} el - Message DOM element
   */
  async function processMessage(el) {
    // Determine message type (flexible class matching)
    const classList = el.className || '';
    const isBot = classList.includes('assistantMessage') || classList.includes('botMessage');
    const isUser = classList.includes('userMessage');
    
    if (!isBot && !isUser) return;
    
    // Get message text
    const text = getMessageText(el);
    if (!text) return;
    
    // Check if already processed using full message hash for unique identification
    // This prevents different messages with identical first N characters from being skipped
    const id = hashString(text);
    if (processedMessages.has(id)) return;
    processedMessages.add(id);
    
    // Handle user messages
    if (isUser) {
      userHasInteracted = true;
      console.log(`[OMEL] 👤 USER: "${text.substring(0, 50)}..."`);
      conversationContext.push({ type: 'user', text });
      if (conversationContext.length > 20) conversationContext.shift();
      return; // Don't evaluate user messages
    }
    
    // Handle bot messages
    console.log(`[OMEL] 🤖 BOT: "${text.substring(0, 50)}..."`);
    conversationContext.push({ type: 'bot', text });
    if (conversationContext.length > 20) conversationContext.shift();
    
    // Skip evaluation if user hasn't interacted yet (initial welcome messages)
    if (!userHasInteracted) {
      console.log('[OMEL] ⏭️ Skipping (no user interaction yet)');
      return;
    }
    
    // Evaluate the bot's response
    const result = await evaluateMessage(text, getLastUserMessage());
    
    // Log the result
    logToServer({
      type: result.safe ? 'pass' : 'block',
      botMessage: text,
      userMessage: getLastUserMessage(),
      reason: result.reason
    });
    
    // Take action based on result and mode
    if (!result.safe && CONFIG.mode === 'protection') {
      executeBlock(el, text, result.reason);
    } else if (!result.safe) {
      console.log('[OMEL] ⚠️ UNSAFE (Monitor Mode):', result.reason);
    }
  }

  // ============================================================
  // DOM OBSERVER
  // ============================================================

  /**
   * Set up MutationObserver to watch for new messages
   * @param {Element} messagesList - The messages container element
   */
  function setupObserver(messagesList) {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          
          // Check if the node itself is a message (flexible class matching)
          const classList = node.className || '';
          if (classList.includes('assistantMessage') || 
              classList.includes('botMessage') ||
              classList.includes('userMessage')) {
            processMessage(node);
          }
          
          // Check for messages within the added node using all selectors
          const allMessageSelectors = [
            ...CONFIG.botMessageSelectors,
            ...CONFIG.userMessageSelectors
          ].join(', ');
          
          node.querySelectorAll?.(allMessageSelectors)
            .forEach(msg => processMessage(msg));
        });
      });
    });
    
    observer.observe(messagesList, { childList: true, subtree: true });
    console.log('[OMEL] ✅ Watching for messages');
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize the guard script
   */
  async function init() {
    // Fetch configuration from server first
    await fetchDealershipConfig();
    
    // Check if there's an existing block
    const blockData = checkBlockFlag();
    if (blockData) {
      console.log('[OMEL] Block active from previous session');
      waitForChatbot(() => {
        clearImpelStorage();
        showBlockOverlay();
      });
      return;
    }

    // Wait for chatbot and start monitoring
    waitForChatbot((chatbot, messagesList) => {
      console.log('[OMEL] ✅ Chatbot found and ready');
      
      // Process any existing messages using all selectors
      const allMessageSelectors = [
        ...CONFIG.botMessageSelectors,
        ...CONFIG.userMessageSelectors
      ].join(', ');
      
      messagesList.querySelectorAll(allMessageSelectors)
        .forEach(msg => processMessage(msg));
      
      // Start watching for new messages
      setupObserver(messagesList);
      console.log('[OMEL] 🛡️ Protection active');
    });
  }

  /**
   * Find an element using multiple selectors (first match wins)
   */
  function findWithSelectors(parent, selectors) {
    for (const selector of selectors) {
      const el = parent.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  /**
   * Wait for the chatbot to appear in the DOM
   * @param {Function} callback - Called with (chatbot, messagesList) when found
   */
  function waitForChatbot(callback) {
    let retries = 0;
    let found = false;
    
    function tryFind() {
      const chatbot = document.querySelector(CONFIG.chatbotSelector);
      if (!chatbot) return false;
      
      const messagesList = findWithSelectors(chatbot, CONFIG.messagesListSelectors);
      
      if (messagesList) {
        if (!found) {
          found = true;
          console.log('[OMEL] ✅ Found messages list with selector');
          callback(chatbot, messagesList);
        }
        return true;
      }
      return false;
    }
    
    function initialSearch() {
      if (tryFind()) return;
      
      if (++retries < CONFIG.maxRetries) {
        setTimeout(initialSearch, CONFIG.checkInterval);
      } else {
        // Initial search failed - log and keep trying periodically
        const chatbot = document.querySelector(CONFIG.chatbotSelector);
        console.log(`[OMEL] ⚠️ Initial search done. Chatbot: ${chatbot ? 'YES' : 'NO'}, Messages: NO. Will keep trying...`);
        startPeriodicCheck();
      }
    }
    
    function startPeriodicCheck() {
      // Keep checking every 5 seconds in case chatbot loads later
      setInterval(() => {
        if (!found && tryFind()) {
          console.log('[OMEL] ✅ Chatbot found (delayed load)');
        }
      }, CONFIG.recheckInterval);
    }
    
    // Also watch for chatbot container to be added to DOM
    function setupDOMWatcher() {
      const observer = new MutationObserver((mutations) => {
        if (found) return;
        
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            
            // Check if this is the chatbot or contains it
            if (node.id === 'impel-chatbot' || node.querySelector?.('#impel-chatbot')) {
              console.log('[OMEL] 🔍 Detected chatbot being added to DOM, will retry finding messages...');
              // Try multiple times with delays since internal elements load after container
              [500, 1000, 2000, 3000, 5000].forEach(delay => {
                setTimeout(() => {
                  if (!found) tryFind();
                }, delay);
              });
              return;
            }
          }
        }
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Start looking after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initialSearch();
        setupDOMWatcher();
      });
    } else {
      initialSearch();
      setupDOMWatcher();
    }
  }

  // Start initialization
  init();

  // ============================================================
  // DEBUG API
  // ============================================================
  
  /**
   * Expose debug methods on window.OMEL for testing
   * This is in a function so it can be called even on duplicate script loads
   */
  function exposeDebugAPI() {
    window.OMEL = {
      clearBlock: clearBlockFlag,
      getConfig: () => CONFIG,
      getLogs: () => JSON.parse(localStorage.getItem(CONFIG.storageKeyLogs) || '[]'),
      setMode: m => { CONFIG.mode = m; console.log('Mode:', m); },
      // Debug: Check if chatbot is currently visible
      checkChatbot: () => {
        const chatbot = document.querySelector(CONFIG.chatbotSelector);
        const messagesList = chatbot ? findWithSelectors(chatbot, CONFIG.messagesListSelectors) : null;
        console.log('[OMEL] Debug - Chatbot element:', chatbot ? '✅ Found' : '❌ Not found');
        console.log('[OMEL] Debug - Messages list:', messagesList ? '✅ Found' : '❌ Not found');
        if (chatbot && !messagesList) {
          console.log('[OMEL] Debug - Chatbot HTML preview:', chatbot.innerHTML.substring(0, 500));
        }
        return { chatbot: !!chatbot, messagesList: !!messagesList };
      },
      // Debug: Manually reinitialize
      reinit: () => {
        console.log('[OMEL] 🔄 Reinitializing...');
        processedMessages.clear();
        conversationContext = [];
        userHasInteracted = false;
        init();
      }
    };
  }
  
  // Expose the debug API
  exposeDebugAPI();

  // ============================================================
  // CHATBOT RELOAD DETECTION
  // ============================================================
  
  /**
   * Watch for chatbot being removed and re-added (happens on restart/navigation)
   * This catches scenarios where the chatbot widget reloads itself
   */
  let chatbotWasFound = false;
  
  setInterval(() => {
    const chatbot = document.querySelector(CONFIG.chatbotSelector);
    const messagesList = chatbot ? findWithSelectors(chatbot, CONFIG.messagesListSelectors) : null;
    
    if (chatbot && messagesList) {
      if (!chatbotWasFound) {
        // Chatbot just appeared (or reappeared after being removed)
        chatbotWasFound = true;
        console.log('[OMEL] 🔄 Chatbot detected via reload check, ensuring monitoring is active...');
        
        // Check if we're already watching this messages list
        if (!messagesList.__omelWatching) {
          messagesList.__omelWatching = true;
          console.log('[OMEL] ✅ Setting up new observer for chatbot (reload detection)');
          
          // Process existing messages using all selectors
          const allMessageSelectors = [
            ...CONFIG.botMessageSelectors,
            ...CONFIG.userMessageSelectors
          ].join(', ');
          
          messagesList.querySelectorAll(allMessageSelectors)
            .forEach(msg => processMessage(msg));
          
          // Set up observer
          setupObserver(messagesList);
        }
      }
    } else if (!chatbot) {
      // Only reset flag when chatbot container is removed, not when messagesList is temporarily null
      // This prevents duplicate observer attachments when internal elements are temporarily missing
      if (chatbotWasFound) {
        chatbotWasFound = false;
        console.log('[OMEL] 👋 Chatbot container removed, will re-detect when it returns');
      }
    }
    // Note: If chatbot exists but messagesList is null, we keep chatbotWasFound = true
    // to avoid re-attaching observers when messagesList reappears
  }, 2000); // Check every 2 seconds

})();
