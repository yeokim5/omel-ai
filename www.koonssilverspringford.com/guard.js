/**
 * LOMEL AI - Guard.js
 * The Final Safety Layer for Unreliable AI Chatbots
 * 
 * INSTALLATION (add to dealership website <head>):
 * 
 * <script 
 *   src="https://cdn.lomel.ai/guard.js" 
 *   data-dealership="YOUR_DEALERSHIP_SLUG"
 *   data-api="https://api.lomel.ai">
 * </script>
 * 
 * Or for local testing:
 * <script 
 *   src="/guard.js" 
 *   data-dealership="koons-motors"
 *   data-api="http://localhost:3001">
 * </script>
 */

(function() {
  'use strict';

  // ============================================================
  // GET CONFIGURATION FROM SCRIPT TAG
  // ============================================================
  
  const scriptTag = document.currentScript || document.querySelector('script[data-dealership]');
  
  const CONFIG = {
    // Required: Unique identifier for this dealership
    dealershipId: scriptTag?.getAttribute('data-dealership') || 'demo-dealership',
    
    // API endpoint (defaults to localhost for development)
    apiBase: scriptTag?.getAttribute('data-api') || 'http://localhost:3001',
    
    // Mode: 'protection' (block) or 'monitor' (log only)
    mode: scriptTag?.getAttribute('data-mode') || 'protection',
    
    // Timeout for API calls
    apiTimeout: 5000,
    
    // Impel chatbot selectors
    chatbotSelector: '#impel-chatbot',
    messagesListSelector: '._messagesList_hamrg_14',
    botMessageSelector: '._assistantMessageContainer_ricj1_1',
    userMessageSelector: '._userMessageContainer_1e59u_1',
    messageTextSelector: '._messageText_frcys_28',
    inputSelector: '._inputText_ti1lk_18',
    sendButtonSelector: '._sendButton_ti1lk_41',
    chatWindowSelector: '._chatWindow_18och_19',
    
    // Timing
    checkInterval: 500,
    maxRetries: 60,
    blockDuration: 24 * 60 * 60 * 1000,
    
    // Storage keys (namespaced by dealership)
    get storageKeyBlock() { return `lomel_${this.dealershipId}_blocked` },
    get storageKeyLogs() { return `lomel_${this.dealershipId}_logs` },
    
    // Safe response (fetched from server or default)
    safeResponse: `For accurate information on this topic, please speak with our team directly. They'll provide you with precise details based on your specific situation.`,
    dealershipPhone: '(555) 123-4567',
    dealershipName: 'Our Dealership',
  };

  // Build API endpoints
  CONFIG.apiEndpoint = `${CONFIG.apiBase}/api/evaluate`;
  CONFIG.logEndpoint = `${CONFIG.apiBase}/api/log`;
  CONFIG.configEndpoint = `${CONFIG.apiBase}/api/config/${CONFIG.dealershipId}`;

  const processedMessages = new Set();
  let conversationContext = [];
  let userHasInteracted = false; // Only scan after user sends first message

  console.log(`[LOMEL] Guard.js loaded for: ${CONFIG.dealershipId}`);
  console.log(`[LOMEL] Mode: ${CONFIG.mode}`);
  console.log(`[LOMEL] API: ${CONFIG.apiBase}`);

  // ============================================================
  // FETCH DEALERSHIP CONFIG FROM SERVER
  // ============================================================
  
  async function fetchDealershipConfig() {
    try {
      const response = await fetch(CONFIG.configEndpoint);
      if (response.ok) {
        const data = await response.json();
        if (data.safeResponse) CONFIG.safeResponse = data.safeResponse;
        if (data.phone) CONFIG.dealershipPhone = data.phone;
        if (data.name) CONFIG.dealershipName = data.name;
        if (data.mode) CONFIG.mode = data.mode;
        console.log(`[LOMEL] Config loaded for ${data.name || CONFIG.dealershipId}`);
      }
    } catch (e) {
      console.log('[LOMEL] Using default config');
    }
  }

  // ============================================================
  // STORAGE
  // ============================================================

  function clearImpelStorage() {
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
    
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (name.toLowerCase().includes('impel')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
  }

  function setBlockFlag(reason, originalMessage) {
    localStorage.setItem(CONFIG.storageKeyBlock, JSON.stringify({
      blocked: true,
      timestamp: Date.now(),
      reason,
      originalMessage
    }));
  }

  function checkBlockFlag() {
    const data = localStorage.getItem(CONFIG.storageKeyBlock);
    if (!data) return null;
    
    try {
      const parsed = JSON.parse(data);
      if (Date.now() - parsed.timestamp > CONFIG.blockDuration) {
        localStorage.removeItem(CONFIG.storageKeyBlock);
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

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
  // UI
  // ============================================================

  function showBlockOverlay() {
    const chatbot = document.querySelector(CONFIG.chatbotSelector);
    if (!chatbot) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'lomel-block-overlay';
    overlay.innerHTML = `
      <div style="
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
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">🛡️</div>
        <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0;">
          Chat Session Ended
        </h2>
        <p style="font-size: 14px; color: #666; margin: 0 0 20px 0; line-height: 1.5;">
          Your conversation was ended to protect you<br>from inaccurate information.
        </p>
        <p style="font-size: 14px; color: #333; margin: 0 0 8px 0;">
          For accurate information:
        </p>
        <a href="tel:${CONFIG.dealershipPhone}" style="
          font-size: 24px; font-weight: 700; color: #015FEA;
          text-decoration: none; margin: 8px 0 24px 0;
        ">📞 ${CONFIG.dealershipPhone}</a>
        <button id="lomel-start-fresh" style="
          background: #f0f0f0; border: none; padding: 12px 24px;
          border-radius: 8px; font-size: 14px; color: #333; cursor: pointer;
        ">Start Fresh Chat</button>
        <p style="font-size: 11px; color: #999; margin-top: 20px;">
          Protected by LOMEL AI
        </p>
      </div>
    `;
    
    const chatWindow = chatbot.querySelector(CONFIG.chatWindowSelector) || chatbot;
    chatWindow.style.position = 'relative';
    chatWindow.appendChild(overlay);
    
    document.getElementById('lomel-start-fresh').addEventListener('click', clearBlockFlag);
  }

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

  function replaceMessage(messageElement, newText) {
    const textEl = messageElement.querySelector(CONFIG.messageTextSelector);
    if (textEl) {
      const article = textEl.querySelector('article');
      if (article) {
        article.innerHTML = `<p>${newText}</p>`;
      } else {
        textEl.textContent = newText;
      }
    }
  }

  // ============================================================
  // BLOCKING
  // ============================================================

  function executeBlock(messageElement, originalMessage, reason) {
    console.log('[LOMEL] 🚨 BLOCKING:', reason);
    
    replaceMessage(messageElement, CONFIG.safeResponse);
    disableChatInput();
    clearImpelStorage();
    setBlockFlag(reason, originalMessage);
    showBlockOverlay();
    
    // Note: Logging is done in processMessage, not here (to avoid duplicates)
  }

  // ============================================================
  // API
  // ============================================================

  async function evaluateMessage(botMessage, userMessage) {
    console.log('[LOMEL] Evaluating...');
    
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
      console.log(`[LOMEL] Result: ${result.safe ? 'SAFE ✓' : 'UNSAFE ✗'}`);
      return result;
      
    } catch (error) {
      console.warn('[LOMEL] API failed, using fallback');
      return fallbackCheck(botMessage);
    }
  }

  function fallbackCheck(text) {
    const riskyPatterns = [
      /guarantee/i,
      /promise/i,
      /\$\d{1,3},?\d{3}/,
      /0%\s*apr/i,
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
      // Silent fail
    }
    
    // Local backup
    const logs = JSON.parse(localStorage.getItem(CONFIG.storageKeyLogs) || '[]');
    logs.push({ ...data, timestamp: Date.now() });
    localStorage.setItem(CONFIG.storageKeyLogs, JSON.stringify(logs.slice(-100)));
  }

  // ============================================================
  // MESSAGE PROCESSING
  // ============================================================

  function getMessageText(el) {
    const textEl = el.querySelector(CONFIG.messageTextSelector);
    if (!textEl) return null;
    const p = textEl.querySelector('article p');
    return p ? p.textContent.trim() : textEl.textContent.trim();
  }

  function getLastUserMessage() {
    for (let i = conversationContext.length - 1; i >= 0; i--) {
      if (conversationContext[i].type === 'user') return conversationContext[i].text;
    }
    return '';
  }

  async function processMessage(el) {
    const isBot = el.classList.contains('_assistantMessageContainer_ricj1_1') ||
                  el.classList.contains('_assistantMessageContainerNoAvatar_ricj1_1');
    const isUser = el.classList.contains('_userMessageContainer_1e59u_1');
    
    if (!isBot && !isUser) return;
    
    const text = getMessageText(el);
    if (!text) return;
    
    const id = text.substring(0, 50);
    if (processedMessages.has(id)) return;
    processedMessages.add(id);
    
    // Track user messages
    if (isUser) {
      userHasInteracted = true;
      console.log(`[LOMEL] 👤 USER: "${text.substring(0, 50)}..."`);
      conversationContext.push({ type: 'user', text });
      if (conversationContext.length > 20) conversationContext.shift();
      return; // Don't evaluate user messages
    }
    
    // Bot message - only evaluate if user has interacted
    console.log(`[LOMEL] 🤖 BOT: "${text.substring(0, 50)}..."`);
    conversationContext.push({ type: 'bot', text });
    if (conversationContext.length > 20) conversationContext.shift();
    
    // Skip evaluation if user hasn't interacted yet (initial welcome messages)
    if (!userHasInteracted) {
      console.log('[LOMEL] ⏭️ Skipping (no user interaction yet)');
      return;
    }
    
    // Evaluate the bot's response
    const result = await evaluateMessage(text, getLastUserMessage());
    
    logToServer({
      type: result.safe ? 'pass' : 'block',
      botMessage: text,
      userMessage: getLastUserMessage(),
      reason: result.reason
    });
    
    if (!result.safe && CONFIG.mode === 'protection') {
      executeBlock(el, text, result.reason);
    } else if (!result.safe) {
      console.log('[LOMEL] ⚠️ UNSAFE (Monitor Mode):', result.reason);
    }
  }

  // ============================================================
  // OBSERVER
  // ============================================================

  function setupObserver(messagesList) {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          
          if (node.matches?.(CONFIG.botMessageSelector) || 
              node.matches?.(CONFIG.userMessageSelector) ||
              node.matches?.('._assistantMessageContainerNoAvatar_ricj1_1')) {
            processMessage(node);
          }
          
          node.querySelectorAll?.(`${CONFIG.botMessageSelector}, ${CONFIG.userMessageSelector}`)
            .forEach(msg => processMessage(msg));
        });
      });
    });
    
    observer.observe(messagesList, { childList: true, subtree: true });
    console.log('[LOMEL] ✅ Watching for messages');
  }

  // ============================================================
  // INIT
  // ============================================================

  async function init() {
    // Fetch config from server first
    await fetchDealershipConfig();
    
    const blockData = checkBlockFlag();
    if (blockData) {
      console.log('[LOMEL] Block active from previous session');
      waitForChatbot(() => {
        clearImpelStorage();
        showBlockOverlay();
      });
      return;
    }

    waitForChatbot((chatbot, messagesList) => {
      console.log('[LOMEL] ✅ Chatbot found');
      
      messagesList.querySelectorAll(`${CONFIG.botMessageSelector}, ${CONFIG.userMessageSelector}`)
        .forEach(msg => processMessage(msg));
      
      setupObserver(messagesList);
      console.log('[LOMEL] 🛡️ Protection active');
    });
  }

  function waitForChatbot(callback) {
    let retries = 0;
    
    function tryFind() {
      const chatbot = document.querySelector(CONFIG.chatbotSelector);
      const messagesList = chatbot?.querySelector(CONFIG.messagesListSelector);
      
      if (chatbot && messagesList) {
        callback(chatbot, messagesList);
        return;
      }
      
      if (++retries < CONFIG.maxRetries) {
        setTimeout(tryFind, CONFIG.checkInterval);
      }
    }
    
    document.readyState === 'loading' 
      ? document.addEventListener('DOMContentLoaded', tryFind)
      : tryFind();
  }

  init();

  // Debug API
  window.LOMEL = {
    clearBlock: clearBlockFlag,
    getConfig: () => CONFIG,
    getLogs: () => JSON.parse(localStorage.getItem(CONFIG.storageKeyLogs) || '[]'),
    setMode: m => { CONFIG.mode = m; console.log('Mode:', m); }
  };

})();
