(function () {
  "use strict";

  const WEBHOOK_URL =
    "https://n8n-wqps.srv1912599.hstgr.cloud/webhook/chat";

  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    #katexs-chat-widget *,
    #katexs-chat-widget *::before,
    #katexs-chat-widget *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    #katexs-chat-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 4px 24px rgba(0, 0, 0, 0.4),
        0 0 40px rgba(99, 102, 241, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
      z-index: 2147483647;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  box-shadow 0.3s ease;
      animation: katexs-pulse 3s ease-in-out infinite;
    }

    #katexs-chat-bubble:hover {
      transform: scale(1.08);
      box-shadow:
        0 6px 32px rgba(0, 0, 0, 0.5),
        0 0 60px rgba(99, 102, 241, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    #katexs-chat-bubble svg {
      width: 24px;
      height: 24px;
      fill: none;
      stroke: rgba(255, 255, 255, 0.9);
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: opacity 0.2s ease, transform 0.3s ease;
    }

    #katexs-chat-bubble .katexs-close-icon {
      position: absolute;
      opacity: 0;
      transform: rotate(-90deg) scale(0.6);
    }

    #katexs-chat-bubble.open .katexs-chat-icon {
      opacity: 0;
      transform: rotate(90deg) scale(0.6);
    }

    #katexs-chat-bubble.open .katexs-close-icon {
      opacity: 1;
      transform: rotate(0deg) scale(1);
    }

    @keyframes katexs-pulse {
      0%, 100% { box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 40px rgba(99,102,241,0.15); }
      50% { box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 50px rgba(99,102,241,0.25); }
    }

    #katexs-chat-window {
      position: fixed;
      bottom: 92px;
      right: 24px;
      width: 380px;
      height: 560px;
      max-height: calc(100vh - 120px);
      background: #0a0a0f;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.6),
        0 0 80px rgba(99, 102, 241, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.04);
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      opacity: 0;
      transform: translateY(16px) scale(0.96);
      pointer-events: none;
      transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    #katexs-chat-window.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .katexs-header {
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      flex-shrink: 0;
    }

    .katexs-header-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 12px rgba(99, 102, 241, 0.3);
    }

    .katexs-header-icon svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: #fff;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .katexs-header-text h3 {
      font-size: 15px;
      font-weight: 600;
      color: #f0f0f5;
      letter-spacing: -0.01em;
    }

    .katexs-header-text span {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      font-weight: 400;
    }

    .katexs-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
      display: inline-block;
      margin-right: 4px;
      animation: katexs-status-pulse 2s ease-in-out infinite;
    }

    @keyframes katexs-status-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .katexs-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.08) transparent;
    }

    .katexs-messages::-webkit-scrollbar {
      width: 4px;
    }

    .katexs-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .katexs-messages::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 2px;
    }

    .katexs-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.55;
      color: #e4e4eb;
      animation: katexs-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
      word-wrap: break-word;
    }

    @keyframes katexs-fade-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .katexs-msg.user {
      align-self: flex-end;
      background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .katexs-msg.bot {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-bottom-left-radius: 4px;
    }

    .katexs-typing {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 18px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      border-bottom-left-radius: 4px;
      animation: katexs-fade-in 0.3s ease forwards;
      opacity: 0;
    }

    .katexs-typing-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.35);
      animation: katexs-typing-bounce 1.4s ease-in-out infinite;
    }

    .katexs-typing-dot:nth-child(2) { animation-delay: 0.16s; }
    .katexs-typing-dot:nth-child(3) { animation-delay: 0.32s; }

    @keyframes katexs-typing-bounce {
      0%, 60%, 100% {
        transform: translateY(0);
        background: rgba(255, 255, 255, 0.2);
      }
      30% {
        transform: translateY(-6px);
        background: rgba(99, 102, 241, 0.7);
      }
    }

    .katexs-input-area {
      padding: 12px 16px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.02);
      flex-shrink: 0;
    }

    .katexs-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 4px 4px 4px 14px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .katexs-input-row:focus-within {
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.08);
    }

    .katexs-input-row input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #e4e4eb;
      font-size: 13.5px;
      font-family: inherit;
      padding: 8px 0;
    }

    .katexs-input-row input::placeholder {
      color: rgba(255, 255, 255, 0.25);
    }

    .katexs-send-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease, opacity 0.15s ease,
                  box-shadow 0.15s ease;
      flex-shrink: 0;
      opacity: 0.5;
    }

    .katexs-send-btn.active {
      opacity: 1;
      box-shadow: 0 2px 12px rgba(99, 102, 241, 0.35);
    }

    .katexs-send-btn.active:hover {
      transform: scale(1.06);
    }

    .katexs-send-btn:active {
      transform: scale(0.94);
    }

    .katexs-send-btn svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: #fff;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .katexs-powered {
      text-align: center;
      padding: 8px 0 4px;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.2);
      letter-spacing: 0.02em;
    }

    @media (max-width: 440px) {
      #katexs-chat-window {
        width: calc(100vw - 16px);
        height: calc(100vh - 100px);
        right: 8px;
        bottom: 80px;
        border-radius: 12px;
      }
      #katexs-chat-bubble {
        bottom: 16px;
        right: 16px;
      }
    }
  `;

  function stripMarkdown(text) {
    if (!text) return "";
    return text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      .replace(/~~(.+?)~~/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/\\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function parseResponse(raw) {
    if (typeof raw === "string") {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.response === "string") {
          return stripMarkdown(parsed.response);
        }
        return stripMarkdown(raw);
      } catch (e) {
        return stripMarkdown(raw);
      }
    }
    if (raw && typeof raw === "object") {
      if (typeof raw.response === "string") {
        return stripMarkdown(raw.response);
      }
      if (typeof raw.output === "string") {
        return stripMarkdown(raw.output);
      }
      if (typeof raw.text === "string") {
        return stripMarkdown(raw.text);
      }
      if (typeof raw.message === "string") {
        return stripMarkdown(raw.message);
      }
    }
    return stripMarkdown(String(raw));
  }

  function createWidget() {
    var container = document.createElement("div");
    container.id = "katexs-chat-widget";

    var style = document.createElement("style");
    style.textContent = STYLES;
    container.appendChild(style);

    container.innerHTML += `
      <div id="katexs-chat-window">
        <div class="katexs-header">
          <div class="katexs-header-icon">
            <svg viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div class="katexs-header-text">
            <h3>Katexs AI</h3>
            <span><span class="katexs-status-dot"></span>Online</span>
          </div>
        </div>
        <div class="katexs-messages" id="katexs-messages">
          <div class="katexs-msg bot">Hi! I'm the Katexs AI assistant. How can I help you today?</div>
        </div>
        <div class="katexs-input-area">
          <div class="katexs-input-row">
            <input type="text" id="katexs-input" placeholder="Ask anything..." autocomplete="off" />
            <button class="katexs-send-btn" id="katexs-send">
              <svg viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <div class="katexs-powered">Powered by Katexs</div>
        </div>
      </div>

      <div id="katexs-chat-bubble">
        <svg class="katexs-chat-icon" viewBox="0 0 24 24">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
        <svg class="katexs-close-icon" viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
    `;

    document.body.appendChild(container);

    var bubble = document.getElementById("katexs-chat-bubble");
    var chatWindow = document.getElementById("katexs-chat-window");
    var input = document.getElementById("katexs-input");
    var sendBtn = document.getElementById("katexs-send");
    var messagesEl = document.getElementById("katexs-messages");
    var sessionId = "katexs-" + Math.random().toString(36).substring(2, 10);

    input.addEventListener("input", function () {
      sendBtn.classList.toggle("active", input.value.trim().length > 0);
    });

    bubble.addEventListener("click", function () {
      var isOpen = chatWindow.classList.toggle("open");
      bubble.classList.toggle("open", isOpen);
      if (isOpen) input.focus();
    });

    function addMessage(text, sender) {
      var msg = document.createElement("div");
      msg.className = "katexs-msg " + sender;
      msg.textContent = text;
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return msg;
    }

    function showTyping() {
      var el = document.createElement("div");
      el.className = "katexs-typing";
      el.id = "katexs-typing-indicator";
      el.innerHTML =
        '<div class="katexs-typing-dot"></div>' +
        '<div class="katexs-typing-dot"></div>' +
        '<div class="katexs-typing-dot"></div>';
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function hideTyping() {
      var el = document.getElementById("katexs-typing-indicator");
      if (el) el.remove();
    }

    function sendMessage() {
      var text = input.value.trim();
      if (!text) return;

      addMessage(text, "user");
      input.value = "";
      sendBtn.classList.remove("active");
      showTyping();

      fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId,
          chatInput: text,
        }),
      })
        .then(function (res) {
          return res.text();
        })
        .then(function (raw) {
          hideTyping();
          var reply = parseResponse(raw);
          addMessage(reply || "Sorry, I couldn't process that. Please try again.", "bot");
        })
        .catch(function () {
          hideTyping();
          addMessage("Connection error. Please try again.", "bot");
        });
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendMessage();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();
