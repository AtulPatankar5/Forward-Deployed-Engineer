/**
 * Zaslon AI Chat Assistant
 * Client-side script handling UI interactions and local backend API calls.
 */

// Configuration & State
const DEFAULT_API_URL = 'http://localhost:8080/api/chat';
let currentApiUrl = localStorage.getItem('zaslon_api_url') || DEFAULT_API_URL;
let isGenerating = false;

// DOM Elements
const chatContainer = document.getElementById('chatContainer');
const welcomeBanner = document.getElementById('welcomeBanner');
const messagesList = document.getElementById('messagesList');
const typingIndicator = document.getElementById('typingIndicator');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const charCount = document.getElementById('charCount');
const clearChatBtn = document.getElementById('clearChatBtn');
const configBtn = document.getElementById('configBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const apiUrlInput = document.getElementById('apiUrlInput');
const resetApiUrlBtn = document.getElementById('resetApiUrlBtn');
const saveApiUrlBtn = document.getElementById('saveApiUrlBtn');
const statusIndicator = document.getElementById('statusIndicator');
const brandStatusText = document.getElementById('brandStatusText');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  apiUrlInput.value = currentApiUrl;
  autoResizeInput();
  bindEvents();
});

// Event Bindings
function bindEvents() {
  // Form submission
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserSubmit();
  });

  // Textarea input auto-grow and key handling
  chatInput.addEventListener('input', () => {
    autoResizeInput();
    updateCharCounter();
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserSubmit();
    }
  });

  // Prompt chips
  document.querySelectorAll('.prompt-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) {
        chatInput.value = prompt;
        autoResizeInput();
        updateCharCounter();
        handleUserSubmit();
      }
    });
  });

  // Clear Chat
  clearChatBtn.addEventListener('click', () => {
    if (messagesList.children.length === 0) return;
    if (confirm('Clear the conversation history?')) {
      messagesList.innerHTML = '';
      welcomeBanner.style.display = 'flex';
      chatInput.focus();
    }
  });

  // Settings Modal Handlers
  configBtn.addEventListener('click', () => {
    settingsModal.hidden = !settingsModal.hidden;
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.hidden = true;
  });

  resetApiUrlBtn.addEventListener('click', () => {
    currentApiUrl = DEFAULT_API_URL;
    apiUrlInput.value = DEFAULT_API_URL;
    localStorage.removeItem('zaslon_api_url');
    settingsModal.hidden = true;
    updateBackendStatus();
  });

  saveApiUrlBtn.addEventListener('click', () => {
    const val = apiUrlInput.value.trim();
    if (val) {
      currentApiUrl = val;
      localStorage.setItem('zaslon_api_url', currentApiUrl);
      settingsModal.hidden = true;
      updateBackendStatus();
    }
  });

  // Close settings when clicking outside card
  document.addEventListener('click', (e) => {
    if (!settingsModal.hidden && !settingsModal.contains(e.target) && e.target !== configBtn && !configBtn.contains(e.target)) {
      settingsModal.hidden = true;
    }
  });
}

// Auto resize textarea height
function autoResizeInput() {
  chatInput.style.height = 'auto';
  const newHeight = Math.min(chatInput.scrollHeight, 160);
  chatInput.style.height = `${newHeight}px`;
}

// Character counter
function updateCharCounter() {
  const len = chatInput.value.length;
  charCount.textContent = `${len}/4000`;
}

// Handle sending user message
async function handleUserSubmit() {
  const text = chatInput.value.trim();
  if (!text || isGenerating) return;

  // Hide welcome banner once chat begins
  welcomeBanner.style.display = 'none';

  // Add User Message
  appendMessage({
    sender: 'user',
    text: text,
    timestamp: getCurrentTime()
  });

  // Clear & reset input
  chatInput.value = '';
  autoResizeInput();
  updateCharCounter();
  setGenerating(true);

  // Scroll to bottom
  scrollToBottom();

  try {
    const responseText = await callChatApi(text);
    appendMessage({
      sender: 'bot',
      text: responseText,
      timestamp: getCurrentTime()
    });
    setApiStatus(true);
  } catch (error) {
    console.error('Chat API Error:', error);
    setApiStatus(false);

    appendErrorMessage(
      `Could not communicate with Zaslon backend at <code>${escapeHtml(currentApiUrl)}</code>.<br>` +
      `<small style="color: #cbd5e1;">${escapeHtml(error.message || 'Network connection failed')}</small>`,
      text
    );
  } finally {
    setGenerating(false);
    scrollToBottom();
    chatInput.focus();
  }
}

// API Call implementation matching curl spec:
// curl --location 'http://localhost:8080/api/chat' --data 'tell me a joke'
async function callChatApi(prompt) {
  const response = await fetch(currentApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8'
    },
    body: prompt
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText || 'Server error'}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await response.json();
    // Handle standard JSON properties or return stringified
    return json.response || json.message || json.content || json.text || JSON.stringify(json, null, 2);
  } else {
    // Default raw text response
    return await response.text();
  }
}

// Render normal message
function appendMessage({ sender, text, timestamp }) {
  const row = document.createElement('div');
  row.className = `message-row ${sender}`;

  const avatar = document.createElement('div');
  avatar.className = `message-avatar ${sender}-avatar`;
  avatar.textContent = sender === 'user' ? 'U' : 'Z';

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'message-content-wrapper';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = formatMessageContent(text);

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.innerHTML = `
    <span>${timestamp}</span>
    <button class="copy-btn" title="Copy to clipboard">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>Copy</span>
    </button>
  `;

  // Attach copy handler
  const copyBtn = meta.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.querySelector('span').textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.querySelector('span').textContent = 'Copy';
      }, 1800);
    });
  });

  contentWrapper.appendChild(bubble);
  contentWrapper.appendChild(meta);

  row.appendChild(avatar);
  row.appendChild(contentWrapper);

  messagesList.appendChild(row);
}

// Render error message with retry & simulated response option
function appendErrorMessage(errorHtml, originalPrompt) {
  const row = document.createElement('div');
  row.className = 'message-row bot error';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar bot-avatar';
  avatar.textContent = 'Z';

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'message-content-wrapper';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = `
    <div style="margin-bottom: 8px;">${errorHtml}</div>
    <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
      <button class="secondary-btn retry-btn" style="padding: 4px 10px; font-size: 0.76rem;">🔄 Retry</button>
      <button class="secondary-btn demo-btn" style="padding: 4px 10px; font-size: 0.76rem;">✨ Demo Simulated Response</button>
    </div>
  `;

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.innerHTML = `<span>${getCurrentTime()} &bull; Connection issue</span>`;

  // Retry button
  bubble.querySelector('.retry-btn').addEventListener('click', () => {
    row.remove();
    chatInput.value = originalPrompt;
    handleUserSubmit();
  });

  // Demo simulated response button (for testing when backend is temporarily offline)
  bubble.querySelector('.demo-btn').addEventListener('click', () => {
    row.remove();
    appendMessage({
      sender: 'bot',
      text: getSimulatedResponse(originalPrompt),
      timestamp: getCurrentTime()
    });
    scrollToBottom();
  });

  contentWrapper.appendChild(bubble);
  contentWrapper.appendChild(meta);

  row.appendChild(avatar);
  row.appendChild(contentWrapper);

  messagesList.appendChild(row);
}

// Format message text (code snippets, line breaks, bolding)
function formatMessageContent(rawText) {
  let escaped = escapeHtml(rawText);

  // Multi-line code blocks ```code```
  escaped = escaped.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold **text**
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert line breaks to <br> outside code blocks
  escaped = escaped.replace(/\n/g, '<br>');

  return escaped;
}

// Simulated fallback response for local testing
function getSimulatedResponse(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('where is my order') || lower.includes('track')) {
    return "🛵 **Live Order Tracking (#ZS-8821)**\n" +
           "Your delivery partner **Rahul** is currently en route on MG Road with your piping hot meal!\n\n" +
           "• **Estimated Arrival**: 6-8 minutes\n" +
           "• **Restaurant**: Spice Symphony Bistro\n" +
           "• **Status**: On the way &bull; Contact partner: +91 98765-43210";
  }
  if (lower.includes('delayed') || lower.includes('late') || lower.includes('time')) {
    return "⏱️ **Delivery Delay Notice**\n" +
           "We sincerely apologize for the delay on order #ZS-8821! Heavy peak-hour traffic has added ~7 minutes to the trip.\n\n" +
           "🎁 To make up for this, we have credited a **₹50 Zaslon Care voucher** to your wallet. Rahul is hurrying safely to your doorstep!";
  }
  if (lower.includes('missing') || lower.includes('incorrect') || lower.includes('wrong')) {
    return "⚠️ **Missing / Incorrect Item Resolution**\n" +
           "We are so sorry your order was incomplete! Please let us know which item is missing:\n\n" +
           "1. **Instant Refund** to your Zaslon Pay balance (credits within 2 mins)\n" +
           "2. **Express Re-delivery** from the restaurant at zero additional charge\n\n" +
           "Reply with **1** or **2** to proceed immediately.";
  }
  if (lower.includes('refund') || lower.includes('invoice') || lower.includes('bill')) {
    return "💳 **Refund & Billing Assistance**\n" +
           "I've initiated a refund review for your recent transaction on order #ZS-8821 (Amount: ₹480).\n\n" +
           "• **Method**: Original payment source (UPI / Card)\n" +
           "• **Reference ID**: `TXN-REF-994182`\n" +
           "• **Timeline**: 2 to 4 business hours depending on your bank.";
  }
  if (lower.includes('joke')) {
    const jokes = [
      "Why did the tomato blush? Because it saw the salad dressing! 🍅",
      "Why did the pizza delivery guy get an award? Because he delivered under pressure! 🍕",
      "What do you call cheese that isn't yours? Nacho cheese! 🧀",
      "Why don't eggs tell jokes? Because they'd crack each other up! 🥚"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  return `🍔 **Zaslon Customer Care**: I received your request: "${prompt}". When your backend is active at ${currentApiUrl}, live AI responses will appear here in real-time!`;
}

// Utility: HTML Escaping
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Utility: Get formatted current time
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// UI State Toggles
function setGenerating(generating) {
  isGenerating = generating;
  typingIndicator.hidden = !generating;
  sendBtn.disabled = generating;

  if (generating) {
    statusIndicator.className = 'status-indicator pending';
    brandStatusText.textContent = 'Processing prompt...';
  } else {
    updateBackendStatus();
  }
}

function setApiStatus(isOnline) {
  if (isOnline) {
    statusIndicator.className = 'status-indicator';
    statusIndicator.title = 'API Online';
    brandStatusText.textContent = `Connected: ${currentApiUrl.replace(/^https?:\/\//, '')}`;
  } else {
    statusIndicator.className = 'status-indicator offline';
    statusIndicator.title = 'API Offline';
    brandStatusText.textContent = 'Offline / Connecting';
  }
}

function updateBackendStatus() {
  brandStatusText.textContent = `Target: ${currentApiUrl.replace(/^https?:\/\//, '')}`;
}

// Scroll to chat bottom
function scrollToBottom() {
  setTimeout(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, 10);
}
