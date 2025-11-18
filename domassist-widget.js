/**
 * DomAssist Custom GPT Widget
 * Futuristic AI Chat Widget with n8n Webhook Integration
 */

class DomAssistWidget {
    constructor(config) {
        this.config = {
            // n8n Webhook Configuration
            webhookUrl: config.webhookUrl || 'https://n8n.domassist.de/webhook-test/ecc1a840-b626-43ee-9825-0ae80d3feffd',

            // Widget Settings
            assistantName: config.assistantName || 'DomAssist',
            welcomeMessage: config.welcomeMessage || 'Hallo! Ich bin DomAssist, wie kann ich heute helfen?',
            placeholderText: config.placeholderText || 'Schreiben Sie eine Nachricht...',

            // Quick Actions
            quickActions: config.quickActions || [
                '📅 Termin vereinbaren',
                '💬 Frage stellen',
                'ℹ️ Informationen',
                '📞 Kontakt'
            ],

            // Styling
            primaryColor: config.primaryColor || '#14b8a6',
            position: config.position || 'bottom-right',

            // Features
            enableSound: config.enableSound !== false,
            saveHistory: config.saveHistory !== false,
            autoOpen: config.autoOpen || false,
            showNotification: config.showNotification !== false
        };

        this.isOpen = false;
        this.messages = [];
        this.sessionId = this.generateSessionId();

        this.init();
    }

    init() {
        this.createWidget();
        this.attachEventListeners();
        this.loadHistory();

        if (this.config.autoOpen) {
            setTimeout(() => this.toggleChat(), 1000);
        }
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    createWidget() {
        // Create main container
        const container = document.createElement('div');
        container.id = 'domassist-widget-container';
        container.innerHTML = `
            <!-- Chat Button -->
            <button id="domassist-chat-button" aria-label="Chat mit DomAssist öffnen">
                🤖
                ${this.config.showNotification ? '<span class="domassist-badge">1</span>' : ''}
            </button>

            <!-- Chat Window -->
            <div id="domassist-chat-window">
                <!-- Header -->
                <div id="domassist-chat-header">
                    <div class="domassist-header-content">
                        <div class="domassist-avatar">🤖</div>
                        <div class="domassist-header-text">
                            <h3>${this.config.assistantName}</h3>
                            <div class="domassist-status">
                                <span class="domassist-status-dot"></span>
                                Online
                            </div>
                        </div>
                    </div>
                    <button id="domassist-close-button" aria-label="Chat schließen">×</button>
                </div>

                <!-- Messages -->
                <div id="domassist-messages">
                    <div class="domassist-welcome">
                        <div class="domassist-welcome-icon">🤖</div>
                        <h3>Willkommen bei ${this.config.assistantName}!</h3>
                        <p>${this.config.welcomeMessage}</p>
                        ${this.createQuickActions()}
                    </div>
                </div>

                <!-- Input Area -->
                <div id="domassist-input-area">
                    <textarea
                        id="domassist-input"
                        placeholder="${this.config.placeholderText}"
                        rows="1"
                        aria-label="Nachricht eingeben"
                    ></textarea>
                    <button id="domassist-send-button" aria-label="Nachricht senden">
                        ➤
                    </button>
                </div>

                <!-- Powered By -->
                <div class="domassist-powered">
                    Powered by <a href="#" target="_blank">OpenAI Custom GPT</a> + n8n
                </div>
            </div>
        `;

        document.body.appendChild(container);
    }

    createQuickActions() {
        if (!this.config.quickActions || this.config.quickActions.length === 0) {
            return '';
        }

        const actions = this.config.quickActions
            .map(action => `<button class="domassist-quick-action" data-action="${action}">${action}</button>`)
            .join('');

        return `<div class="domassist-quick-actions">${actions}</div>`;
    }

    attachEventListeners() {
        // Chat button
        const chatButton = document.getElementById('domassist-chat-button');
        chatButton.addEventListener('click', () => this.toggleChat());

        // Close button
        const closeButton = document.getElementById('domassist-close-button');
        closeButton.addEventListener('click', () => this.toggleChat());

        // Send button
        const sendButton = document.getElementById('domassist-send-button');
        sendButton.addEventListener('click', () => this.sendMessage());

        // Input field
        const input = document.getElementById('domassist-input');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });

        // Quick actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('domassist-quick-action')) {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.toggleChat();
            }
        });
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('domassist-chat-window');
        const badge = document.querySelector('.domassist-badge');

        if (this.isOpen) {
            chatWindow.classList.add('open');
            if (badge) badge.style.display = 'none';

            // Focus input
            setTimeout(() => {
                document.getElementById('domassist-input').focus();
            }, 400);
        } else {
            chatWindow.classList.remove('open');
        }
    }

    handleQuickAction(action) {
        // Remove welcome message
        const welcome = document.querySelector('.domassist-welcome');
        if (welcome) welcome.remove();

        // Send the quick action as a message
        this.addMessage('user', action);
        this.sendToWebhook(action);
    }

    async sendMessage() {
        const input = document.getElementById('domassist-input');
        const message = input.value.trim();

        if (!message) return;

        // Clear input
        input.value = '';
        input.style.height = 'auto';

        // Remove welcome message if exists
        const welcome = document.querySelector('.domassist-welcome');
        if (welcome) welcome.remove();

        // Add user message
        this.addMessage('user', message);

        // Send to webhook and get response
        await this.sendToWebhook(message);
    }

    addMessage(type, content) {
        const messagesContainer = document.getElementById('domassist-messages');

        const messageDiv = document.createElement('div');
        messageDiv.className = `domassist-message ${type}`;
        messageDiv.innerHTML = `
            <div class="domassist-message-content">${this.escapeHtml(content)}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Save to messages array
        this.messages.push({ type, content, timestamp: Date.now() });
        this.saveHistory();
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('domassist-messages');

        const typingDiv = document.createElement('div');
        typingDiv.className = 'domassist-message bot';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="domassist-message-content">
                <div class="domassist-typing">
                    <div class="domassist-typing-dot"></div>
                    <div class="domassist-typing-dot"></div>
                    <div class="domassist-typing-dot"></div>
                </div>
            </div>
        `;

        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async sendToWebhook(message) {
        // Show typing indicator
        this.showTypingIndicator();

        try {
            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: this.sessionId,
                    timestamp: new Date().toISOString(),
                    context: {
                        url: window.location.href,
                        userAgent: navigator.userAgent,
                        language: navigator.language
                    }
                })
            });

            this.removeTypingIndicator();

            if (!response.ok) {
                throw new Error('Webhook request failed');
            }

            const data = await response.json();

            // Handle response from Custom GPT
            const botMessage = data.response || data.message || data.text ||
                             'Entschuldigung, ich konnte keine Antwort generieren. Bitte versuchen Sie es erneut.';

            this.addMessage('bot', botMessage);

            // Handle special actions (e.g., appointment booking)
            if (data.action) {
                this.handleAction(data.action, data.actionData);
            }

        } catch (error) {
            console.error('DomAssist Widget Error:', error);
            this.removeTypingIndicator();

            this.addMessage('bot',
                '⚠️ Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung oder versuchen Sie es später erneut.'
            );
        }
    }

    handleAction(action, data) {
        switch (action) {
            case 'open_calendar':
                // Open appointment booking
                console.log('Opening calendar with data:', data);
                break;

            case 'send_email':
                // Trigger email
                console.log('Sending email with data:', data);
                break;

            case 'redirect':
                // Redirect to URL
                if (data && data.url) {
                    window.location.href = data.url;
                }
                break;

            default:
                console.log('Unknown action:', action, data);
        }
    }

    saveHistory() {
        if (this.config.saveHistory) {
            try {
                localStorage.setItem('domassist_chat_history', JSON.stringify(this.messages));
            } catch (e) {
                console.error('Failed to save chat history:', e);
            }
        }
    }

    loadHistory() {
        if (this.config.saveHistory) {
            try {
                const history = localStorage.getItem('domassist_chat_history');
                if (history) {
                    this.messages = JSON.parse(history);

                    // Restore messages (optional - you can enable this if you want to show previous messages)
                    // this.restoreMessages();
                }
            } catch (e) {
                console.error('Failed to load chat history:', e);
            }
        }
    }

    restoreMessages() {
        const messagesContainer = document.getElementById('domassist-messages');
        const welcome = messagesContainer.querySelector('.domassist-welcome');

        if (this.messages.length > 0 && welcome) {
            welcome.remove();
        }

        this.messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `domassist-message ${msg.type}`;
            messageDiv.innerHTML = `
                <div class="domassist-message-content">${this.escapeHtml(msg.content)}</div>
            `;
            messagesContainer.appendChild(messageDiv);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    open() {
        if (!this.isOpen) this.toggleChat();
    }

    close() {
        if (this.isOpen) this.toggleChat();
    }

    sendCustomMessage(message) {
        this.addMessage('user', message);
        this.sendToWebhook(message);
    }

    clearHistory() {
        this.messages = [];
        localStorage.removeItem('domassist_chat_history');
        const messagesContainer = document.getElementById('domassist-messages');
        messagesContainer.innerHTML = `
            <div class="domassist-welcome">
                <div class="domassist-welcome-icon">🤖</div>
                <h3>Willkommen bei ${this.config.assistantName}!</h3>
                <p>${this.config.welcomeMessage}</p>
                ${this.createQuickActions()}
            </div>
        `;
    }
}

// Auto-initialize if config is provided via data attributes
document.addEventListener('DOMContentLoaded', () => {
    const script = document.currentScript || document.querySelector('script[data-domassist-webhook]');

    if (script && script.dataset.domassistWebhook) {
        const config = {
            webhookUrl: script.dataset.domassistWebhook,
            assistantName: script.dataset.domassistName,
            welcomeMessage: script.dataset.domassistWelcome,
            autoOpen: script.dataset.domassistAutoopen === 'true'
        };

        window.domassist = new DomAssistWidget(config);
    }
});

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DomAssistWidget;
}
