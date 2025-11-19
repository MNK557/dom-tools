/**
 * DomAssist Custom GPT Widget - IMPROVED VERSION
 * With automatic contact data extraction
 */

class DomAssistWidget {
    constructor(config) {
        this.config = {
            webhookUrl: config.webhookUrl || 'https://n8n.domassist.de/webhook-test/ecc1a840-b626-43ee-9825-0ae80d3feffd',
            assistantName: config.assistantName || 'DomAssist',
            welcomeMessage: config.welcomeMessage || 'Hallo! Ich bin DomAssist, wie kann ich heute helfen?',
            placeholderText: config.placeholderText || 'Schreiben Sie eine Nachricht...',
            quickActions: config.quickActions || [
                '📅 Termin vereinbaren',
                '💬 Frage stellen',
                'ℹ️ Informationen',
                '📞 Kontakt'
            ],
            primaryColor: config.primaryColor || '#14b8a6',
            position: config.position || 'bottom-right',
            enableSound: config.enableSound !== false,
            saveHistory: config.saveHistory !== false,
            autoOpen: config.autoOpen || false,
            showNotification: config.showNotification !== false
        };

        this.isOpen = false;
        this.messages = [];
        this.sessionId = this.generateSessionId();
        this.userContacts = {}; // ⭐ NEU

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
        const container = document.createElement('div');
        container.id = 'domassist-widget-container';
        container.innerHTML = `
            <button id="domassist-chat-button" aria-label="Chat mit DomAssist öffnen">
                🤖
                ${this.config.showNotification ? '<span class="domassist-badge">1</span>' : ''}
            </button>

            <div id="domassist-chat-window">
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

                <div id="domassist-messages">
                    <div class="domassist-welcome">
                        <div class="domassist-welcome-icon">🤖</div>
                        <h3>Willkommen bei ${this.config.assistantName}!</h3>
                        <p>${this.config.welcomeMessage}</p>
                        ${this.createQuickActions()}
                    </div>
                </div>

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

                <div class="domassist-powered">
                    Powered by <a href="https://domassist.de" target="_blank">DomAssist</a>
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
        const chatButton = document.getElementById('domassist-chat-button');
        chatButton.addEventListener('click', () => this.toggleChat());

        const closeButton = document.getElementById('domassist-close-button');
        closeButton.addEventListener('click', () => this.toggleChat());

        const sendButton = document.getElementById('domassist-send-button');
        sendButton.addEventListener('click', () => this.sendMessage());

        const input = document.getElementById('domassist-input');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('domassist-quick-action')) {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            }
        });

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

            setTimeout(() => {
                document.getElementById('domassist-input').focus();
            }, 400);
        } else {
            chatWindow.classList.remove('open');
        }
    }

    handleQuickAction(action) {
        const welcome = document.querySelector('.domassist-welcome');
        if (welcome) welcome.remove();

        this.addMessage('user', action);
        this.sendToWebhook(action);
    }

    async sendMessage() {
        const input = document.getElementById('domassist-input');
        const message = input.value.trim();

        if (!message) return;

        input.value = '';
        input.style.height = 'auto';

        const welcome = document.querySelector('.domassist-welcome');
        if (welcome) welcome.remove();

        this.addMessage('user', message);
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

    // ⭐ NEU: Automatische Kontaktdaten-Extraktion
    extractContactData(message) {
        const contactData = {
            name: null,
            email: null,
            telefon: null
        };

        let workingMessage = message;

        // Email
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
        const emailMatch = workingMessage.match(emailRegex);
        if (emailMatch) {
            contactData.email = emailMatch[0];
            workingMessage = workingMessage.replace(emailMatch[0], '').trim();
        }

        // Telefon (deutsche Formate)
        const phoneRegex = /(\+49\s?|0)(\d{2,5})[\s\-\/]?(\d{3,10})[\s\-\/]?(\d{0,10})/g;
        const phoneMatch = workingMessage.match(phoneRegex);
        if (phoneMatch) {
            contactData.telefon = phoneMatch.sort((a, b) => b.length - a.length)[0].replace(/\s+/g, ' ');
            workingMessage = workingMessage.replace(contactData.telefon, '').trim();
        }

        // Name (was übrig bleibt)
        let remainingText = workingMessage
            .replace(/[,;|]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const words = remainingText.split(' ').filter(w => w.length > 1);
        if (words.length >= 2) {
            contactData.name = words.slice(0, 3).join(' ');
        } else if (words.length === 1 && words[0].length > 2) {
            contactData.name = words[0];
        }

        return contactData;
    }

    async sendToWebhook(message) {
        this.showTypingIndicator();

        // ⭐ NEU: Extrahiere Kontaktdaten
        const extractedContacts = this.extractContactData(message);
        
        if (extractedContacts.name || extractedContacts.email || extractedContacts.telefon) {
            this.userContacts = {
                ...this.userContacts,
                ...Object.fromEntries(
                    Object.entries(extractedContacts).filter(([_, v]) => v != null)
                )
            };
            
            console.log('📋 Kontaktdaten erkannt:', this.userContacts);
        }

        try {
            // ⭐ NEU: Strukturiertes Payload
            const payload = {
                meta: {
                    sessionId: this.sessionId,
                    timestamp: new Date().toISOString(),
                    source: 'landing-page-widget',
                    hasContactData: Object.keys(this.userContacts).length > 0
                },
                kontakt: this.userContacts,
                message: message,
                context: {
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    language: navigator.language
                }
            };

            console.log('📤 Sende an Webhook:', payload);

            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            this.removeTypingIndicator();

            if (!response.ok) {
                throw new Error('Webhook request failed');
            }

            const data = await response.json();
            console.log('📥 Webhook Response:', data);

            const botMessage = data.response || data.message || data.text ||
                             'Entschuldigung, ich konnte keine Antwort generieren.';

            this.addMessage('bot', botMessage);

            if (data.action) {
                this.handleAction(data.action, data.actionData);
            }

        } catch (error) {
            console.error('DomAssist Widget Error:', error);
            this.removeTypingIndicator();

            this.addMessage('bot',
                '⚠️ Verbindungsfehler. Bitte versuchen Sie es später erneut.'
            );
        }
    }

    handleAction(action, data) {
        switch (action) {
            case 'open_calendar':
                console.log('Opening calendar:', data);
                break;

            case 'send_email':
                console.log('Sending email:', data);
                break;

            case 'redirect':
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
                localStorage.setItem('domassist_contacts', JSON.stringify(this.userContacts));
            } catch (e) {
                console.error('Failed to save chat history:', e);
            }
        }
    }

    loadHistory() {
        if (this.config.saveHistory) {
            try {
                const history = localStorage.getItem('domassist_chat_history');
                const contacts = localStorage.getItem('domassist_contacts');
                
                if (history) {
                    this.messages = JSON.parse(history);
                }
                
                if (contacts) {
                    this.userContacts = JSON.parse(contacts);
                }
            } catch (e) {
                console.error('Failed to load chat history:', e);
            }
        }
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
        this.userContacts = {};
        localStorage.removeItem('domassist_chat_history');
        localStorage.removeItem('domassist_contacts');
        
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

// Auto-initialize
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

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DomAssistWidget;
}
