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

// Convenience aliases matching user naming convention
const messageInput = chatInput;
const sendButton = sendBtn;

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

// Typing indicator helpers
function showTyping() {
  typingIndicator.hidden = false;
}

function hideTyping() {
  typingIndicator.hidden = true;
}

// Add message helper compatible with user snippet
function addMessage(sender, message = '') {
  const role = (sender === 'assistant' || sender === 'bot') ? 'bot' : 'user';
  return appendMessage({
    sender: role,
    text: message,
    timestamp: getCurrentTime()
  });
}

// Send message with live stream consumption from backend
async function sendMessage() {
  const message = messageInput.value.trim();

  if (!message || isGenerating) {
    return;
  }

  // Hide welcome banner once chat begins
  if (welcomeBanner) {
    welcomeBanner.style.display = 'none';
  }

  addMessage("user", message);

  messageInput.value = "";
  autoResizeInput();
  updateCharCounter();
  messageInput.focus();

  sendButton.disabled = true;
  setGenerating(true);

  showTyping();
  scrollToBottom();

  let assistantRow = null;
  let assistantBubble = null;
  let hasStartedStreaming = false;
  let accumulatedText = "";

  try {
    const response = await fetch(currentApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      },
      body: message
    });

    if (!response.ok) {
      throw new Error(`Request failed (HTTP ${response.status}: ${response.statusText || 'Server error'})`);
    }

    if (!response.body) {
      throw new Error("ReadableStream not supported on this response");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, {
        stream: true
      });

      if (!hasStartedStreaming) {
        hideTyping();

        assistantRow = addMessage(
          "assistant",
          ""
        );

        assistantBubble =
          assistantRow.querySelector(".message");

        hasStartedStreaming = true;
      }

      accumulatedText += chunk;
      assistantRow.dataset.rawText = accumulatedText;
      assistantBubble.innerHTML = formatMessageContent(accumulatedText) + '<span class="streaming-cursor"></span>';

      scrollToBottom();
    }

    // Process any lingering byte sequences
    const leftover = decoder.decode();
    if (leftover) {
      accumulatedText += leftover;
      if (assistantRow) assistantRow.dataset.rawText = accumulatedText;
    }

    // Clean up cursor when streaming concludes
    if (assistantBubble) {
      assistantBubble.innerHTML = formatMessageContent(accumulatedText);
    }

    setApiStatus(true);
  } catch (error) {
    console.error("Chat streaming error:", error);
    setApiStatus(false);

    if (!hasStartedStreaming) {
      hideTyping();
      appendErrorMessage(
        `Could not communicate with Zaslon backend at <code>${escapeHtml(currentApiUrl)}</code>.<br>` +
        `<small style="color: #cbd5e1;">${escapeHtml(error.message || 'Network connection failed')}</small>`,
        message
      );
    } else if (assistantBubble) {
      assistantBubble.innerHTML = formatMessageContent(accumulatedText) +
        `<br><span style="color: #f87171; font-size: 0.8rem;">⚠️ Stream interrupted: ${escapeHtml(error.message)}</span>`;
    }
  } finally {
    hideTyping();
    setGenerating(false);
    scrollToBottom();
    messageInput.focus();
  }
}

// Alias handleUserSubmit to sendMessage for backwards compatibility
const handleUserSubmit = sendMessage;

// Render normal message row and return the row element
function appendMessage({ sender, text = '', timestamp = getCurrentTime() }) {
  const row = document.createElement('div');
  row.className = `message-row ${sender}`;

  const avatar = document.createElement('div');
  avatar.className = `message-avatar ${sender}-avatar`;
  avatar.textContent = sender === 'user' ? 'U' : 'Z';

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'message-content-wrapper';

  const bubble = document.createElement('div');
  // Includes 'message' and 'message-bubble' classes so querySelector('.message') works
  bubble.className = 'message-bubble message';
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

  // Attach copy handler using dataset.rawText if dynamically updated
  const copyBtn = meta.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => {
    const textToCopy = row.dataset.rawText !== undefined ? row.dataset.rawText : text;
    navigator.clipboard.writeText(textToCopy).then(() => {
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

  row.dataset.rawText = text;
  messagesList.appendChild(row);

  return row;
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

  // Demo simulated response button (for testing streaming when backend is temporarily offline)
  bubble.querySelector('.demo-btn').addEventListener('click', () => {
    row.remove();
    streamSimulatedResponse(originalPrompt);
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

// Simulated stream generator for local UI demonstration
function streamSimulatedResponse(prompt) {
  const fullText = getSimulatedResponse(prompt);
  if (welcomeBanner) {
    welcomeBanner.style.display = 'none';
  }
  setGenerating(true);
  showTyping();
  scrollToBottom();

  setTimeout(() => {
    hideTyping();
    const assistantRow = addMessage('assistant', '');
    const assistantBubble = assistantRow.querySelector('.message');

    let currentIdx = 0;
    const chunkSize = 4;
    let accumulated = '';

    const timer = setInterval(() => {
      if (currentIdx >= fullText.length) {
        clearInterval(timer);
        assistantBubble.innerHTML = formatMessageContent(accumulated);
        assistantRow.dataset.rawText = accumulated;
        setGenerating(false);
        messageInput.focus();
        scrollToBottom();
        return;
      }

      accumulated += fullText.slice(currentIdx, currentIdx + chunkSize);
      currentIdx += chunkSize;
      assistantRow.dataset.rawText = accumulated;
      assistantBubble.innerHTML = formatMessageContent(accumulated) + '<span class="streaming-cursor"></span>';
      scrollToBottom();
    }, 20);
  }, 350);
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
