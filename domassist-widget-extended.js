/**
 * DomAssist Custom GPT Widget - EXTENDED VERSION
 * Features: DSGVO Consent, Data Collection, Voice/Chat Toggle, Advanced n8n Integration
 */

class DomAssistWidget {
    constructor(config) {
        this.config = {
            // n8n Webhook Configuration
            webhookUrl: config.webhookUrl || 'https://n8n.domassist.de/webhook/ecc1a840-b626-43ee-9825-0ae80d3feffd',

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
        this.currentMode = 'chat'; // 'chat' or 'voice'
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentIntent = null;
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
            // Check if consent is not older than 1 year
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
        this.showToast('✅ Ihre Daten wurden gelöscht.', 'success');
        this.close();
    }

    // ========================================
    // WIDGET CREATION
    // ========================================

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

                <!-- Data Collection Form (Hidden by default) -->
                ${this.createDataForm()}

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

                    <!-- Voice Record Button (Hidden by default) -->
                    <button id="domassist-voice-record" class="domassist-voice-record">
                        <span class="voice-icon">🎤</span>
                        <span class="voice-text">Aufnahme starten</span>
                    </button>
                </div>

                <!-- Powered By -->
                <div class="domassist-powered">
                    Powered by <a href="#" target="_blank">OpenAI Custom GPT</a> + n8n
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

    createDataForm() {
        return `
            <div class="domassist-data-form" id="domassist-data-form">
                <h3>📋 Um Ihnen zu helfen, benötige ich einige Infos:</h3>

                <div class="domassist-form-group">
                    <input type="text" id="form-name" class="domassist-form-input show" placeholder="Ihr Name *" />
                    <div class="domassist-form-error" id="error-name">Bitte geben Sie Ihren Namen ein.</div>
                </div>

                <div class="domassist-form-group">
                    <input type="email" id="form-email" class="domassist-form-input show" placeholder="E-Mail *" />
                    <div class="domassist-form-error" id="error-email">Bitte geben Sie eine gültige E-Mail ein.</div>
                </div>

                <div class="domassist-form-group">
                    <input type="text" id="form-firma" class="domassist-form-input" placeholder="Firma *" />
                    <div class="domassist-form-error" id="error-firma">Bitte geben Sie Ihre Firma ein.</div>
                </div>

                <div class="domassist-form-group">
                    <input type="tel" id="form-telefon" class="domassist-form-input" placeholder="Telefon *" />
                    <div class="domassist-form-error" id="error-telefon">Bitte geben Sie Ihre Telefonnummer ein.</div>
                </div>

                <div class="domassist-form-group">
                    <input type="date" id="form-datum" class="domassist-form-input" placeholder="Wunsch-Datum *" />
                    <div class="domassist-form-error" id="error-datum">Bitte wählen Sie ein Datum.</div>
                </div>

                <div class="domassist-form-group">
                    <input type="time" id="form-uhrzeit" class="domassist-form-input" placeholder="Wunsch-Uhrzeit *" />
                    <div class="domassist-form-error" id="error-uhrzeit">Bitte wählen Sie eine Uhrzeit.</div>
                </div>

                <div class="domassist-form-group">
                    <input type="text" id="form-mitarbeiter" class="domassist-form-input" placeholder="Zuständiger Mitarbeiter (optional)" />
                </div>

                <div class="domassist-form-group">
                    <textarea id="form-nachricht" class="domassist-form-input" placeholder="Zusätzliche Informationen"></textarea>
                </div>

                <button class="domassist-form-submit" id="domassist-form-submit">
                    Absenden
                </button>
            </div>
        `;
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
                            <li>Kontaktdaten (nur bei Anfrage)</li>
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

        // Mode toggle (Voice/Chat)
        document.querySelectorAll('.domassist-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        // Voice record button
        const voiceBtn = document.getElementById('domassist-voice-record');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());
        }

        // DSGVO Popup
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

            // Revoke consent link
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

        // Data form submit
        const formSubmit = document.getElementById('domassist-form-submit');
        if (formSubmit) {
            formSubmit.addEventListener('click', () => this.submitDataForm());
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

        // Focus input
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
                <div class="domassist-message-content">${this.escapeHtml(content)}</div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Save to messages array
        this.messages.push({ type, content, timestamp: Date.now(), isAudio });
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

    // ========================================
    // MODE SWITCHING (Chat/Voice)
    // ========================================

    switchMode(mode) {
        this.currentMode = mode;

        // Update button states
        document.querySelectorAll('.domassist-mode-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            }
        });

        // Show/hide appropriate input
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

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                // Send audio to webhook
                await this.sendToWebhook('🎤 Voice Message', base64Audio);
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            // Update UI
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
            this.showToast('⚠️ Mikrofonzugriff verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;

            // Reset UI
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
    // DATA COLLECTION FORM
    // ========================================

    showDataForm(intent) {
        this.currentIntent = intent;
        const form = document.getElementById('domassist-data-form');

        // Reset all fields
        form.querySelectorAll('.domassist-form-input').forEach(field => {
            field.classList.remove('show', 'error');
            field.required = false;
        });

        form.querySelectorAll('.domassist-form-error').forEach(error => {
            error.classList.remove('show');
        });

        // Basis always required
        ['form-name', 'form-email'].forEach(id => {
            const field = document.getElementById(id);
            field.classList.add('show');
            field.required = true;
        });

        // Intent-specific fields
        switch (intent.toUpperCase()) {
            case 'TERMIN':
                ['form-firma', 'form-telefon', 'form-datum', 'form-uhrzeit', 'form-mitarbeiter', 'form-nachricht'].forEach(id => {
                    const field = document.getElementById(id);
                    field.classList.add('show');
                    if (id !== 'form-mitarbeiter' && id !== 'form-nachricht') {
                        field.required = true;
                    }
                });
                break;

            case 'ANGEBOT':
                ['form-firma', 'form-telefon', 'form-mitarbeiter'].forEach(id => {
                    document.getElementById(id).classList.add('show');
                });
                document.getElementById('form-firma').required = false;
                break;

            case 'AUFTRAG':
                ['form-firma', 'form-telefon', 'form-mitarbeiter', 'form-nachricht'].forEach(id => {
                    const field = document.getElementById(id);
                    field.classList.add('show');
                    if (id === 'form-firma') field.required = true;
                });
                break;

            case 'SUPPORT':
            case 'INFO':
                // Only name and email (already set)
                ['form-nachricht'].forEach(id => {
                    document.getElementById(id).classList.add('show');
                });
                break;

            default:
                // Default: name, email, nachricht
                document.getElementById('form-nachricht').classList.add('show');
        }

        form.classList.add('visible');
    }

    hideDataForm() {
        const form = document.getElementById('domassist-data-form');
        form.classList.remove('visible');

        // Clear all fields
        form.querySelectorAll('.domassist-form-input').forEach(field => {
            field.value = '';
            field.classList.remove('error');
        });
    }

    validateDataForm() {
        let isValid = true;
        const form = document.getElementById('domassist-data-form');

        form.querySelectorAll('.domassist-form-input.show').forEach(field => {
            const errorDiv = document.getElementById('error-' + field.id.replace('form-', ''));

            // Reset error state
            field.classList.remove('error');
            if (errorDiv) errorDiv.classList.remove('show');

            // Check if required and empty
            if (field.required && !field.value.trim()) {
                field.classList.add('error');
                if (errorDiv) errorDiv.classList.add('show');
                isValid = false;
                return;
            }

            // Email validation
            if (field.type === 'email' && field.value.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(field.value.trim())) {
                    field.classList.add('error');
                    if (errorDiv) {
                        errorDiv.textContent = 'Bitte geben Sie eine gültige E-Mail ein.';
                        errorDiv.classList.add('show');
                    }
                    isValid = false;
                }
            }

            // Phone validation (optional - basic check)
            if (field.id === 'form-telefon' && field.value.trim() && field.value.trim().length < 6) {
                field.classList.add('error');
                if (errorDiv) {
                    errorDiv.textContent = 'Bitte geben Sie eine gültige Telefonnummer ein.';
                    errorDiv.classList.add('show');
                }
                isValid = false;
            }
        });

        return isValid;
    }

    async submitDataForm() {
        if (!this.validateDataForm()) {
            this.showToast('⚠️ Bitte füllen Sie alle Pflichtfelder korrekt aus.', 'error');
            return;
        }

        // Collect form data
        const formData = {
            name: document.getElementById('form-name').value.trim(),
            email: document.getElementById('form-email').value.trim(),
            firma: document.getElementById('form-firma').value.trim(),
            telefon: document.getElementById('form-telefon').value.trim(),
            datum: document.getElementById('form-datum').value,
            uhrzeit: document.getElementById('form-uhrzeit').value,
            mitarbeiter: document.getElementById('form-mitarbeiter').value.trim(),
            nachricht: document.getElementById('form-nachricht').value.trim()
        };

        // Store user contacts
        this.userContacts = formData;

        // Hide form
        this.hideDataForm();

        // Show confirmation
        this.addMessage('bot', `✅ Vielen Dank, ${formData.name}! Ihre Daten wurden erfasst. Ich verarbeite Ihre Anfrage...`);

        // Send to webhook with full data
        await this.sendCompleteRequest(formData);
    }

    // ========================================
    // WEBHOOK COMMUNICATION (Extended)
    // ========================================

    async sendToWebhook(message, audioData = null) {
        // Show typing indicator
        this.showTypingIndicator();
        this.showLoading();

        try {
            const payload = this.buildPayload(message, audioData);

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
                throw new Error('Webhook request failed');
            }

            const data = await response.json();

            // Handle response
            await this.handleWebhookResponse(data);

        } catch (error) {
            console.error('DomAssist Widget Error:', error);
            this.removeTypingIndicator();
            this.hideLoading();

            this.addMessage('bot',
                '⚠️ Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung oder versuchen Sie es später erneut.'
            );
        }
    }

    async sendCompleteRequest(formData) {
        this.showLoading();

        try {
            const payload = {
                meta: {
                    sessionId: this.sessionId,
                    timestamp: new Date().toISOString(),
                    dsgvoConsent: this.dsgvoConsent,
                    mode: this.currentMode,
                    intent: this.currentIntent,
                    source: 'landing-page-widget'
                },
                kontakt: {
                    name: formData.name,
                    email: formData.email,
                    firma: formData.firma || null,
                    telefon: formData.telefon || null,
                    mitarbeiter: formData.mitarbeiter || null
                },
                anfrage: {
                    typ: this.currentIntent,
                    nachricht: formData.nachricht || null,
                    details: {
                        datum: formData.datum || null,
                        uhrzeit: formData.uhrzeit || null,
                        terminArt: this.currentIntent === 'TERMIN' ? 'Beratung' : null
                    }
                },
                audioData: null
            };

            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            this.hideLoading();

            if (!response.ok) {
                throw new Error('Webhook request failed');
            }

            const data = await response.json();

            // Handle success response
            const botMessage = data.response || data.message ||
                             `✅ Vielen Dank! Ihre Anfrage wurde erfolgreich übermittelt. Wir melden uns in Kürze bei Ihnen.`;

            this.addMessage('bot', botMessage);

            // Reset intent
            this.currentIntent = null;

        } catch (error) {
            console.error('DomAssist Widget Error:', error);
            this.hideLoading();

            this.addMessage('bot',
                '⚠️ Fehler beim Senden der Daten. Bitte versuchen Sie es erneut.'
            );
        }
    }

    buildPayload(message, audioData = null) {
        return {
            meta: {
                sessionId: this.sessionId,
                timestamp: new Date().toISOString(),
                dsgvoConsent: this.dsgvoConsent,
                mode: audioData ? 'voice' : 'chat',
                intent: this.currentIntent,
                source: 'landing-page-widget'
            },
            kontakt: this.userContacts || {},
            anfrage: {
                typ: this.currentIntent || 'CHAT',
                nachricht: message,
                details: {}
            },
            audioData: audioData
        };
    }

    async handleWebhookResponse(data) {
        // Extract response message
        const botMessage = data.response || data.message || data.text ||
                          'Entschuldigung, ich konnte keine Antwort generieren. Bitte versuchen Sie es erneut.';

        // Check if audio response
        if (data.audioUrl || data.audio) {
            this.addMessage('bot', data.audioUrl || data.audio, true);
        } else {
            this.addMessage('bot', botMessage);
        }

        // Handle intent detection
        if (data.intent && !this.currentIntent) {
            this.currentIntent = data.intent.toUpperCase();

            // Check if we need to collect data
            if (this.shouldCollectData(this.currentIntent)) {
                this.showDataForm(this.currentIntent);
            }
        }

        // Handle special actions
        if (data.action) {
            this.handleAction(data.action, data.actionData);
        }
    }

    shouldCollectData(intent) {
        const dataRequiredIntents = ['TERMIN', 'ANGEBOT', 'AUFTRAG', 'KONTAKT'];
        return dataRequiredIntents.includes(intent);
    }

    handleAction(action, data) {
        switch (action) {
            case 'open_calendar':
                console.log('Opening calendar with data:', data);
                break;

            case 'send_email':
                console.log('Sending email with data:', data);
                break;

            case 'redirect':
                if (data && data.url) {
                    window.location.href = data.url;
                }
                break;

            case 'show_form':
                if (data && data.intent) {
                    this.showDataForm(data.intent);
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

        // Set content
        messageEl.textContent = message;
        icon.textContent = type === 'success' ? '✅' : '⚠️';

        // Set style
        toast.classList.remove('success');
        if (type === 'success') {
            toast.classList.add('success');
        }

        // Show
        toast.classList.add('show');

        // Auto-hide after 5 seconds
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
            } catch (e) {
                console.error('Failed to save chat history:', e);
            }
        }
    }

    loadHistory() {
        if (this.config.saveHistory && this.dsgvoConsent) {
            try {
                const history = sessionStorage.getItem('domassist_chat_history');
                if (history) {
                    this.messages = JSON.parse(history);
                }
            } catch (e) {
                console.error('Failed to load chat history:', e);
            }
        }
    }

    // ========================================
    // UTILITIES
    // ========================================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        sessionStorage.removeItem('domassist_chat_history');
        const messagesContainer = document.getElementById('domassist-messages');
        messagesContainer.innerHTML = this.createWelcomeMessage();
        this.showToast('✅ Chat-Verlauf gelöscht.', 'success');
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
            autoOpen: script.dataset.domassistAutoopen === 'true',
            enableVoice: script.dataset.domassistVoice !== 'false',
            enableDSGVO: script.dataset.domassistDsgvo !== 'false'
        };

        window.domassist = new DomAssistWidget(config);
    }
});

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DomAssistWidget;
}
