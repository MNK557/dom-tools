/**
 * DomAssist Custom GPT Widget - CHAT ONLY VERSION
 * Features: DSGVO Consent, Auto Contact Extraction, Voice/Chat Toggle, n8n Integration
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
            enableVoice: config.enableVoice !== false,
            enableDSGVO: config.enableDSGVO !== false,
            saveHistory: config.saveHistory !== false,
            autoOpen: config.autoOpen || false,
            showNotification: config.showNotification !== false,

            // DSGVO
            privacyPolicyUrl: config.privacyPolicyUrl || 'datenschutz.html'
        };

        this.isOpen = false;
        this.messages = [];
        this.sessionId = this.generateSessionId();
        this.dsgvoConsent = false;
        this.currentMode = 'chat';
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.userContacts = {};

        this.init();
    }

    init() {
        this.checkDSGVOConsent();
        this.createWidget();
        this.attachEventListeners();
        this.loadHistory();

        if (this.config.autoOpen && this.dsgvoConsent) {
            setTimeout(() => this.toggleChat(), 1000);
        }
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ========================================
    // DSGVO CONSENT MANAGEMENT
    // ========================================

    checkDSGVOConsent() {
        if (!this.config.enableDSGVO) {
            this.dsgvoConsent = true;
            return;
        }

        const consent = localStorage.getItem('domassist_dsgvo_consent');
        const consentTimestamp = localStorage.getItem('domassist_dsgvo_timestamp');

        if (consent === 'true' && consentTimestamp) {
            const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
            if (parseInt(consentTimestamp) > oneYearAgo) {
                this.dsgvoConsent = true;
                return;
            }
        }

        this.dsgvoConsent = false;
    }

    showDSGVOPopup() {
        const popup = document.getElementById('domassist-dsgvo-popup');
        if (popup) {
            popup.classList.add('show');
        }
    }

    hideDSGVOPopup() {
        const popup = document.getElementById('domassist-dsgvo-popup');
        if (popup) {
            popup.classList.remove('show');
        }
    }

    acceptDSGVO() {
        localStorage.setItem('domassist_dsgvo_consent', 'true');
        localStorage.setItem('domassist_dsgvo_timestamp', Date.now().toString());
        this.dsgvoConsent = true;
        this.hideDSGVOPopup();
        this.openChat();
    }

    declineDSGVO() {
        this.hideDSGVOPopup();
        this.showToast('⚠️ Ohne Zustimmung können wir DomAssist nicht starten.', 'error');
        this.close();
    }

    revokeConsent() {
        localStorage.removeItem('domassist_dsgvo_consent');
        localStorage.removeItem('domassist_dsgvo_timestamp');
        localStorage.removeItem('domassist_chat_history');
        sessionStorage.clear();
        this.dsgvoConsent = false;
        this.messages = [];
        this.userContacts = {};
        this.showToast('✅ Ihre Daten wurden gelöscht.', 'success');
        this.close();
    }

    // ========================================
    // WIDGET CREATION
    // ========================================

    createWidget() {
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
                <!-- Loading Overlay -->
                <div class="domassist-loading-overlay">
                    <div class="domassist-spinner"></div>
                </div>

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

                <!-- Mode Toggle (Voice/Chat) -->
                ${this.createModeToggle()}

                <!-- Messages -->
                <div id="domassist-messages">
                    ${this.createWelcomeMessage()}
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

                    <!-- Voice Record Button -->
                    <button id="domassist-voice-record" class="domassist-voice-record">
                        <span class="voice-icon">🎤</span>
                        <span class="voice-text">Aufnahme starten</span>
                    </button>
                </div>

                <!-- Powered By -->
                <div class="domassist-powered">
                    Powered by <a href="https://domassist.de" target="_blank">DomAssist</a>
                    ${this.config.enableDSGVO ? ' | <a href="#" id="domassist-revoke-consent">Daten löschen</a>' : ''}
                </div>
            </div>

            <!-- DSGVO Popup -->
            ${this.createDSGVOPopup()}

            <!-- Toast Container -->
            <div id="domassist-toast" class="domassist-toast">
                <div class="domassist-toast-content">
                    <span class="domassist-toast-icon"></span>
                    <span class="domassist-toast-message"></span>
                    <button class="domassist-toast-close">×</button>
                </div>
            </div>
        `;

        document.body.appendChild(container);
    }

    createModeToggle() {
        if (!this.config.enableVoice) return '';

        return `
            <div class="domassist-mode-toggle">
                <button class="domassist-mode-btn active" data-mode="chat">
                    💬 Chat
                </button>
                <button class="domassist-mode-btn" data-mode="voice">
                    🎤 Voice
                </button>
            </div>
        `;
    }

    createWelcomeMessage() {
        return `
            <div class="domassist-welcome">
                <div class="domassist-welcome-icon">🤖</div>
                <h3>Willkommen bei ${this.config.assistantName}!</h3>
                <p>${this.config.welcomeMessage}</p>
                ${this.createQuickActions()}
            </div>
        `;
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

    createDSGVOPopup() {
        if (!this.config.enableDSGVO) return '';

        return `
            <div id="domassist-dsgvo-popup">
                <div class="domassist-dsgvo-content">
                    <div class="domassist-dsgvo-header">
                        <div class="domassist-dsgvo-icon">🔒</div>
                        <h3>Datenschutz & Einwilligung</h3>
                    </div>
                    <div class="domassist-dsgvo-body">
                        <p>Um DomAssist nutzen zu können, benötigen wir Ihre Zustimmung zur Verarbeitung folgender Daten:</p>
                        <ul class="domassist-dsgvo-list">
                            <li>Chat-Verlauf (Session-basiert)</li>
                            <li>Kontaktdaten (nur bei Angabe)</li>
                            <li>Cookies für Session-Management</li>
                        </ul>
                        <div class="domassist-dsgvo-checkbox">
                            <input type="checkbox" id="dsgvo-accept-checkbox" />
                            <label for="dsgvo-accept-checkbox">
                                Ich akzeptiere die <a href="${this.config.privacyPolicyUrl}" target="_blank">Datenschutzerklärung</a>
                            </label>
                        </div>
                    </div>
                    <div class="domassist-dsgvo-buttons">
                        <button class="domassist-dsgvo-btn domassist-dsgvo-btn-decline" id="dsgvo-decline">
                            Ablehnen
                        </button>
                        <button class="domassist-dsgvo-btn domassist-dsgvo-btn-accept" id="dsgvo-accept" disabled>
                            Akzeptieren & Starten
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================

    attachEventListeners() {
        // Chat button
        const chatButton = document.getElementById('domassist-chat-button');
        chatButton.addEventListener('click', () => this.handleChatButtonClick());

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

        // Mode toggle
        document.querySelectorAll('.domassist-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        // Voice record button
        const voiceBtn = document.getElementById('domassist-voice-record');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());
        }

        // DSGVO
        if (this.config.enableDSGVO) {
            const checkbox = document.getElementById('dsgvo-accept-checkbox');
            const acceptBtn = document.getElementById('dsgvo-accept');
            const declineBtn = document.getElementById('dsgvo-decline');

            if (checkbox && acceptBtn && declineBtn) {
                checkbox.addEventListener('change', (e) => {
                    acceptBtn.disabled = !e.target.checked;
                });

                acceptBtn.addEventListener('click', () => this.acceptDSGVO());
                declineBtn.addEventListener('click', () => this.declineDSGVO());
            }

            // Revoke consent
            const revokeLink = document.getElementById('domassist-revoke-consent');
            if (revokeLink) {
                revokeLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (confirm('Möchten Sie wirklich alle Ihre Daten löschen?')) {
                        this.revokeConsent();
                    }
                });
            }
        }

        // Toast close
        const toastClose = document.querySelector('.domassist-toast-close');
        if (toastClose) {
            toastClose.addEventListener('click', () => this.hideToast());
        }

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.toggleChat();
            }
        });
    }

    handleChatButtonClick() {
        if (!this.dsgvoConsent && this.config.enableDSGVO) {
            this.showDSGVOPopup();
        } else {
            this.toggleChat();
        }
    }

    // ========================================
    // CHAT FUNCTIONS
    // ========================================

    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('domassist-chat-window');
        const badge = document.querySelector('.domassist-badge');

        if (this.isOpen) {
            this.openChat();
        } else {
            chatWindow.classList.remove('open');
        }
    }

    openChat() {
        const chatWindow = document.getElementById('domassist-chat-window');
        const badge = document.querySelector('.domassist-badge');

        chatWindow.classList.add('open');
        if (badge) badge.style.display = 'none';
        this.isOpen = true;

        setTimeout(() => {
            if (this.currentMode === 'chat') {
                document.getElementById('domassist-input').focus();
            }
        }, 400);
    }

    close() {
        this.isOpen = false;
        const chatWindow = document.getElementById('domassist-chat-window');
        chatWindow.classList.remove('open');
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

    addMessage(type, content, isAudio = false) {
        const messagesContainer = document.getElementById('domassist-messages');

        const messageDiv = document.createElement('div');
        messageDiv.className = `domassist-message ${type}`;

        if (isAudio) {
            messageDiv.innerHTML = `
                <div class="domassist-message-content">
                    <div class="domassist-audio-player">
                        <audio controls>
                            <source src="${content}" type="audio/mpeg">
                        </audio>
                    </div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="domassist-message-content">${this.formatMessage(content)}</div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.messages.push({ type, content, timestamp: Date.now(), isAudio });
        this.saveHistory();
    }

    formatMessage(text) {
        // Escape HTML
        const div = document.createElement('div');
        div.textContent = text;
        let formatted = div.innerHTML;

        // Convert line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        // Convert URLs to links
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank">$1</a>'
        );

        return formatted;
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

    // ========================================
    // MODE SWITCHING
    // ========================================

    switchMode(mode) {
        this.currentMode = mode;

        document.querySelectorAll('.domassist-mode-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            }
        });

        const inputArea = document.getElementById('domassist-input');
        const sendBtn = document.getElementById('domassist-send-button');
        const voiceBtn = document.getElementById('domassist-voice-record');

        if (mode === 'voice') {
            inputArea.style.display = 'none';
            sendBtn.style.display = 'none';
            if (voiceBtn) voiceBtn.classList.add('show');
        } else {
            inputArea.style.display = 'block';
            sendBtn.style.display = 'flex';
            if (voiceBtn) voiceBtn.classList.remove('show');
        }
    }

    // ========================================
    // VOICE RECORDING
    // ========================================

    async toggleVoiceRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                this.audioChunks.push(e.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const base64Audio = await this.blobToBase64(audioBlob);

                stream.getTracks().forEach(track => track.stop());

                await this.sendToWebhook('🎤 Voice Message', base64Audio);
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            const voiceBtn = document.getElementById('domassist-voice-record');
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = `
                <div class="domassist-voice-waveform">
                    <div class="domassist-voice-bar"></div>
                    <div class="domassist-voice-bar"></div>
                    <div class="domassist-voice-bar"></div>
                    <div class="domassist-voice-bar"></div>
                    <div class="domassist-voice-bar"></div>
                </div>
                <span>Aufnahme beenden</span>
            `;

        } catch (error) {
            console.error('Microphone access denied:', error);
            this.showToast('⚠️ Mikrofonzugriff verweigert.', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;

            const voiceBtn = document.getElementById('domassist-voice-record');
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = `
                <span class="voice-icon">🎤</span>
                <span class="voice-text">Aufnahme starten</span>
            `;
        }
    }

    blobToBase64(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });
    }

    // ========================================
    // CONTACT DATA EXTRACTION
    // ========================================

    extractContactData(message) {
        const contactData = {
            name: null,
            email: null,
            telefon: null,
            firma: null
        };

        let workingMessage = message;

        // Email extraction
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
        const emailMatch = workingMessage.match(emailRegex);
        if (emailMatch) {
            contactData.email = emailMatch[0];
            workingMessage = workingMessage.replace(emailMatch[0], '').trim();
        }

        // Phone extraction (German formats)
        const phoneRegex = /(\+49\s?|0)(\d{2,5})[\s\-\/]?(\d{3,10})[\s\-\/]?(\d{0,10})/g;
        const phoneMatch = workingMessage.match(phoneRegex);
        if (phoneMatch) {
            contactData.telefon = phoneMatch.sort((a, b) => b.length - a.length)[0].replace(/\s+/g, ' ');
            workingMessage = workingMessage.replace(contactData.telefon, '').trim();
        }

        // Name extraction (remaining text)
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

    // ========================================
    // WEBHOOK COMMUNICATION
    // ========================================

    async sendToWebhook(message, audioData = null) {
        this.showTypingIndicator();
        this.showLoading();

        // Extract contact data
        const extractedContacts = this.extractContactData(message);
        
        // Merge with existing contacts
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
            const payload = this.buildPayload(message, audioData);

            console.log('📤 Sende an Webhook:', payload);

            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            this.removeTypingIndicator();
            this.hideLoading();

            if (!response.ok) {
                throw new Error(`Webhook error: ${response.status}`);
            }

            const data = await response.json();
            console.log('📥 Webhook Response:', data);

            await this.handleWebhookResponse(data);

        } catch (error) {
            console.error('DomAssist Error:', error);
            this.removeTypingIndicator();
            this.hideLoading();

            this.addMessage('bot',
                '⚠️ Verbindungsfehler. Bitte versuchen Sie es später erneut.'
            );
        }
    }

    buildPayload(message, audioData = null) {
        // Extract contact data
        const extractedContacts = this.extractContactData(message);
        
        // Merge with stored contacts
        const kontaktData = {
            name: this.userContacts.name || extractedContacts.name || null,
            email: this.userContacts.email || extractedContacts.email || null,
            telefon: this.userContacts.telefon || extractedContacts.telefon || null,
            firma: this.userContacts.firma || extractedContacts.firma || null
        };

        // Remove null values
        Object.keys(kontaktData).forEach(key => {
            if (!kontaktData[key]) delete kontaktData[key];
        });

        return {
            meta: {
                sessionId: this.sessionId,
                timestamp: new Date().toISOString(),
                dsgvoConsent: this.dsgvoConsent,
                mode: audioData ? 'voice' : 'chat',
                source: 'landing-page-widget',
                hasContactData: Object.keys(kontaktData).length > 0
            },
            kontakt: kontaktData,
            message: message,
            audioData: audioData
        };
    }

    async handleWebhookResponse(data) {
        // Extract bot message
        const botMessage = data.response || data.message || data.text ||
                          'Entschuldigung, ich konnte keine Antwort generieren.';

        // Check for audio response
        if (data.audioUrl || data.audio) {
            this.addMessage('bot', data.audioUrl || data.audio, true);
        } else {
            this.addMessage('bot', botMessage);
        }

        // Handle special actions
        if (data.action) {
            this.handleAction(data.action, data.actionData);
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

    // ========================================
    // UI HELPERS
    // ========================================

    showLoading() {
        const overlay = document.querySelector('.domassist-loading-overlay');
        if (overlay) overlay.classList.add('show');
    }

    hideLoading() {
        const overlay = document.querySelector('.domassist-loading-overlay');
        if (overlay) overlay.classList.remove('show');
    }

    showToast(message, type = 'error') {
        const toast = document.getElementById('domassist-toast');
        const icon = toast.querySelector('.domassist-toast-icon');
        const messageEl = toast.querySelector('.domassist-toast-message');

        messageEl.textContent = message;
        icon.textContent = type === 'success' ? '✅' : '⚠️';

        toast.classList.remove('success');
        if (type === 'success') {
            toast.classList.add('success');
        }

        toast.classList.add('show');

        setTimeout(() => {
            this.hideToast();
        }, 5000);
    }

    hideToast() {
        const toast = document.getElementById('domassist-toast');
        toast.classList.remove('show');
    }

    // ========================================
    // STORAGE
    // ========================================

    saveHistory() {
        if (this.config.saveHistory && this.dsgvoConsent) {
            try {
                sessionStorage.setItem('domassist_chat_history', JSON.stringify(this.messages));
                sessionStorage.setItem('domassist_contacts', JSON.stringify(this.userContacts));
            } catch (e) {
                console.error('Failed to save chat history:', e);
            }
        }
    }

    loadHistory() {
        if (this.config.saveHistory && this.dsgvoConsent) {
            try {
                const history = sessionStorage.getItem('domassist_chat_history');
                const contacts = sessionStorage.getItem('domassist_contacts');
                
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

    // ========================================
    // PUBLIC API
    // ========================================

    open() {
        if (!this.isOpen) {
            if (!this.dsgvoConsent && this.config.enableDSGVO) {
                this.showDSGVOPopup();
            } else {
                this.toggleChat();
            }
        }
    }

    sendCustomMessage(message) {
        if (!this.dsgvoConsent && this.config.enableDSGVO) {
            this.showToast('⚠️ Bitte akzeptieren Sie zuerst die Datenschutzerklärung.', 'error');
            return;
        }

        this.addMessage('user', message);
        this.sendToWebhook(message);
    }

    clearHistory() {
        this.messages = [];
        this.userContacts = {};
        sessionStorage.removeItem('domassist_chat_history');
        sessionStorage.removeItem('domassist_contacts');
        
        const messagesContainer = document.getElementById('domassist-messages');
        messagesContainer.innerHTML = this.createWelcomeMessage();
        
        this.showToast('✅ Chat-Verlauf gelöscht.', 'success');
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
            autoOpen: script.dataset.domassistAutoopen === 'true',
            enableVoice: script.dataset.domassistVoice !== 'false',
            enableDSGVO: script.dataset.domassistDsgvo !== 'false'
        };

        window.domassist = new DomAssistWidget(config);
    }
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DomAssistWidget;
}
