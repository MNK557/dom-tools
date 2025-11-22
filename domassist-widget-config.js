/**
 * DomAssist Widget Integration - Angepasste Version für index.html
 * 
 * Diese Datei enthält die notwendigen Anpassungen, um das Widget 
 * mit der bestehenden index.html zu harmonisieren
 */

// Konfiguration für harmonisierte Webhook-Kommunikation
const DOMASSIST_CONFIG = {
    // Hauptkonfiguration
    webhookUrl: 'https://n8n.domassist.de/webhook/ecc1a840-b626-43ee-9825-0ae80d3feffd',
    
    // Widget-Einstellungen
    widgetSettings: {
        assistantName: 'DomAssist',
        welcomeMessage: 'Hallo! Ich bin DomAssist, Ihr KI-Assistent für Automatisierung. Wie kann ich Ihnen heute helfen?',
        placeholderText: 'Schreiben Sie eine Nachricht...',
    },
    
    // Schnellaktionen
    quickActions: [
        '📅 Termin vereinbaren',
        '💬 Wie funktioniert DomAssist?',
        'ℹ️ Informationen zu Paketen',
        '📞 Kontakt aufnehmen',
        '💰 Preise ansehen'
    ],
    
    // Features
    features: {
        enableVoice: true,
        enableDSGVO: true,
        saveHistory: true,
        autoOpen: false,
        showNotification: true
    },
    
    // DSGVO
    privacy: {
        policyUrl: 'datenschutz.html',
        consentRequired: true,
        storageKey: 'domassist_dsgvo_consent'
    }
};

/**
 * Erweiterte Widget-Klasse mit harmonisierter Webhook-Kommunikation
 */
class DomAssistWidgetEnhanced extends DomAssistWidget {
    constructor(config) {
        super(config);
        
        // Zusätzliche Initialisierungen für erweiterte Features
        this.initializeEnhancedFeatures();
    }
    
    initializeEnhancedFeatures() {
        // Synchronisation mit dem eingebetteten Chat
        this.syncWithEmbeddedChat();
        
        // Erweiterte Kontaktdaten-Erkennung
        this.enhanceContactExtraction();
        
        // Lead-Scoring
        this.initializeLeadScoring();
    }
    
    /**
     * Synchronisation mit dem eingebetteten Chat in der Demo-Sektion
     */
    syncWithEmbeddedChat() {
        // Event Listener für den eingebetteten Chat
        window.addEventListener('domassist:embedded:message', (event) => {
            const { message, source } = event.detail;
            console.log('📥 Nachricht vom eingebetteten Chat:', message);
            
            // Synchronisiere die Nachricht mit dem Widget
            if (this.isOpen) {
                this.addMessage('user', message);
                this.sendToWebhook(message, null, 'embedded-chat-sync');
            }
        });
        
        // Sende Events zurück an den eingebetteten Chat
        window.addEventListener('domassist:widget:message', (event) => {
            const { message, type } = event.detail;
            
            // Trigger für eingebetteten Chat
            if (window.addBotMessage && type === 'bot') {
                window.addBotMessage(message);
            }
        });
    }
    
    /**
     * Erweiterte Kontaktdaten-Extraktion
     */
    enhanceContactExtraction() {
        // Verbesserte Regex-Patterns für deutsche Kontaktdaten
        this.patterns = {
            email: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
            phone: /(\+49\s?|0)(\d{2,5})[\s\-\/]?(\d{3,10})[\s\-\/]?(\d{0,10})/g,
            mobile: /(01[5-7][0-9])[\s\-]?(\d{3,4})[\s\-]?(\d{3,4})/g,
            company: /(GmbH|AG|UG|e\.V\.|KG|OHG|GbR|Ltd|Inc)/gi,
            name: /(?:Herr|Frau|Dr\.|Prof\.)\s+([A-ZÄÖÜ][a-zäöü]+\s+[A-ZÄÖÜ][a-zäöü]+)/g
        };
    }
    
    /**
     * Lead-Scoring für Interessenten
     */
    initializeLeadScoring() {
        this.leadScore = {
            actions: 0,
            engagement: 0,
            contactProvided: false,
            interestedInPackage: null,
            appointmentRequested: false
        };
        
        // Tracking von User-Aktionen
        this.trackUserEngagement();
    }
    
    trackUserEngagement() {
        // Zähle Interaktionen
        const originalSendMessage = this.sendMessage.bind(this);
        this.sendMessage = async function() {
            this.leadScore.actions++;
            
            // Check für spezifische Interessen
            const input = document.getElementById('domassist-input');
            const message = input.value.toLowerCase();
            
            if (message.includes('termin') || message.includes('beratung')) {
                this.leadScore.appointmentRequested = true;
            }
            
            if (message.includes('starter') || message.includes('business') || message.includes('enterprise')) {
                this.leadScore.interestedInPackage = this.detectPackageInterest(message);
            }
            
            await originalSendMessage.call(this);
        }.bind(this);
    }
    
    detectPackageInterest(message) {
        if (message.includes('starter')) return 'STARTER';
        if (message.includes('business')) return 'BUSINESS';
        if (message.includes('enterprise')) return 'ENTERPRISE';
        return null;
    }
    
    /**
     * Überschriebene buildPayload Methode für harmonisierte Struktur
     */
    buildPayload(message, audioData = null, source = 'widget') {
        // Extrahiere Kontaktdaten
        const extractedContacts = this.extractContactDataEnhanced(message);
        
        // Merge mit gespeicherten Kontakten
        const kontaktData = {
            name: this.userContacts.name || extractedContacts.name || null,
            email: this.userContacts.email || extractedContacts.email || null,
            telefon: this.userContacts.telefon || extractedContacts.telefon || null,
            firma: this.userContacts.firma || extractedContacts.firma || null
        };
        
        // Entferne null-Werte
        Object.keys(kontaktData).forEach(key => {
            if (!kontaktData[key]) delete kontaktData[key];
        });
        
        // Lead-Score aktualisieren
        if (kontaktData.email || kontaktData.telefon) {
            this.leadScore.contactProvided = true;
        }
        
        // Vereinheitlichtes Payload-Format
        const payload = {
            // Hauptdaten
            message: message,
            timestamp: new Date().toISOString(),
            source: `DomAssist Widget - ${source}`,
            
            // Session & Identifikation
            sessionId: this.sessionId,
            mode: audioData ? 'voice' : 'chat',
            
            // Kontaktdaten (wenn vorhanden)
            kontakt: Object.keys(kontaktData).length > 0 ? kontaktData : undefined,
            
            // Audio (wenn vorhanden)
            audioData: audioData,
            
            // Erweiterte Metadaten
            metadata: {
                // Browser-Info
                userAgent: navigator.userAgent,
                language: navigator.language,
                referrer: document.referrer,
                currentUrl: window.location.href,
                
                // Widget-Status
                dsgvoConsent: this.dsgvoConsent,
                hasContactData: Object.keys(kontaktData).length > 0,
                messageCount: this.messages.length,
                
                // Lead-Scoring
                leadScore: this.leadScore,
                
                // Timing
                sessionDuration: Date.now() - parseInt(this.sessionId.split('_')[1]),
                
                // Geräteinformationen
                device: {
                    screenWidth: window.screen.width,
                    screenHeight: window.screen.height,
                    isMobile: /Mobi|Android/i.test(navigator.userAgent)
                }
            },
            
            // Konversationshistorie (optional, für Kontext)
            history: this.config.saveHistory ? this.getRecentHistory(5) : undefined
        };
        
        return payload;
    }
    
    /**
     * Erweiterte Kontaktdaten-Extraktion
     */
    extractContactDataEnhanced(message) {
        const contactData = {
            name: null,
            email: null,
            telefon: null,
            firma: null
        };
        
        let workingMessage = message;
        
        // E-Mail Extraktion
        const emailMatch = workingMessage.match(this.patterns.email);
        if (emailMatch) {
            contactData.email = emailMatch[0].toLowerCase();
            workingMessage = workingMessage.replace(emailMatch[0], '').trim();
        }
        
        // Telefon Extraktion (Desktop & Mobil)
        const phoneMatch = workingMessage.match(this.patterns.phone);
        const mobileMatch = workingMessage.match(this.patterns.mobile);
        
        if (phoneMatch || mobileMatch) {
            const match = phoneMatch || mobileMatch;
            contactData.telefon = match[0].replace(/\s+/g, ' ').trim();
            workingMessage = workingMessage.replace(match[0], '').trim();
        }
        
        // Firmen-Extraktion
        const companyMatch = workingMessage.match(this.patterns.company);
        if (companyMatch) {
            // Finde den vollständigen Firmennamen um die Rechtsform herum
            const companyIndex = workingMessage.indexOf(companyMatch[0]);
            const beforeCompany = workingMessage.substring(Math.max(0, companyIndex - 50), companyIndex);
            const afterCompany = workingMessage.substring(companyIndex, companyIndex + 50);
            
            // Extrahiere Wörter vor und nach der Rechtsform
            const words = (beforeCompany + afterCompany).split(/\s+/);
            contactData.firma = words.filter(w => w.length > 2).join(' ').trim();
        }
        
        // Namen-Extraktion (mit deutschen Anreden)
        const nameMatch = workingMessage.match(this.patterns.name);
        if (nameMatch) {
            contactData.name = nameMatch[1];
        } else {
            // Fallback: Versuche Namen aus verbleibendem Text zu extrahieren
            const cleanedText = workingMessage
                .replace(/[,;|.!?]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            const words = cleanedText.split(' ').filter(w => w.length > 1);
            
            // Suche nach kapitalierten Wörtern (potenzielle Namen)
            const capitalizedWords = words.filter(w => /^[A-ZÄÖÜ]/.test(w));
            
            if (capitalizedWords.length >= 2) {
                contactData.name = capitalizedWords.slice(0, 2).join(' ');
            }
        }
        
        return contactData;
    }
    
    /**
     * Hole die letzten N Nachrichten für Kontext
     */
    getRecentHistory(count = 5) {
        return this.messages.slice(-count).map(msg => ({
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp
        }));
    }
    
    /**
     * Erweiterte Webhook-Response-Behandlung
     */
    async handleWebhookResponse(data) {
        // Standard-Response-Behandlung
        await super.handleWebhookResponse(data);
        
        // Zusätzliche Aktionen basierend auf Response
        if (data.leadUpdate) {
            this.updateLeadScore(data.leadUpdate);
        }
        
        if (data.triggerTerminPopup) {
            // Trigger für Termin-Popup in index.html
            if (window.openTerminPopup) {
                window.openTerminPopup();
            }
        }
        
        if (data.syncToEmbedded) {
            // Synchronisiere mit eingebettetem Chat
            window.dispatchEvent(new CustomEvent('domassist:widget:message', {
                detail: {
                    message: data.response,
                    type: 'bot'
                }
            }));
        }
        
        // Analytics Event
        if (window.gtag && data.analyticsEvent) {
            window.gtag('event', data.analyticsEvent.action, {
                'event_category': 'DomAssist Widget',
                'event_label': data.analyticsEvent.label,
                'value': data.analyticsEvent.value
            });
        }
    }
    
    updateLeadScore(updates) {
        this.leadScore = {
            ...this.leadScore,
            ...updates,
            lastUpdated: Date.now()
        };
        
        // Sende Lead-Score an n8n für CRM-Update
        if (this.leadScore.contactProvided && this.leadScore.actions > 5) {
            this.sendLeadNotification();
        }
    }
    
    async sendLeadNotification() {
        // Sende qualifizierten Lead an n8n
        const leadData = {
            type: 'qualified_lead',
            sessionId: this.sessionId,
            kontakt: this.userContacts,
            leadScore: this.leadScore,
            timestamp: new Date().toISOString()
        };
        
        try {
            await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(leadData)
            });
        } catch (error) {
            console.error('Failed to send lead notification:', error);
        }
    }
}

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    // Initialisiere das erweiterte Widget
    window.domassistWidget = new DomAssistWidgetEnhanced({
        ...DOMASSIST_CONFIG,
        webhookUrl: DOMASSIST_CONFIG.webhookUrl,
        assistantName: DOMASSIST_CONFIG.widgetSettings.assistantName,
        welcomeMessage: DOMASSIST_CONFIG.widgetSettings.welcomeMessage,
        placeholderText: DOMASSIST_CONFIG.widgetSettings.placeholderText,
        quickActions: DOMASSIST_CONFIG.quickActions,
        primaryColor: '#14b8a6',
        position: 'bottom-right',
        enableVoice: DOMASSIST_CONFIG.features.enableVoice,
        enableDSGVO: DOMASSIST_CONFIG.features.enableDSGVO,
        saveHistory: DOMASSIST_CONFIG.features.saveHistory,
        autoOpen: DOMASSIST_CONFIG.features.autoOpen,
        showNotification: DOMASSIST_CONFIG.features.showNotification,
        privacyPolicyUrl: DOMASSIST_CONFIG.privacy.policyUrl
    });
    
    // Globale API für Integration
    window.DomAssist = {
        // Öffne Widget programmatisch
        open: () => window.domassistWidget.open(),
        
        // Schließe Widget
        close: () => window.domassistWidget.close(),
        
        // Sende Nachricht
        sendMessage: (message) => window.domassistWidget.sendCustomMessage(message),
        
        // Hole Kontaktdaten
        getContacts: () => window.domassistWidget.userContacts,
        
        // Hole Lead-Score
        getLeadScore: () => window.domassistWidget.leadScore,
        
        // Lösche History
        clearHistory: () => window.domassistWidget.clearHistory(),
        
        // Event Listener
        on: (event, callback) => {
            window.addEventListener(`domassist:${event}`, callback);
        }
    };
    
    // Verbindung zum eingebetteten Chat herstellen
    if (document.getElementById('embedded-chat-container')) {
        console.log('✅ DomAssist Widget mit eingebettetem Chat verbunden');
        
        // Überwache eingebettete Chat-Nachrichten
        const originalSendToN8N = window.sendToN8N;
        if (originalSendToN8N) {
            window.sendToN8N = function(message) {
                // Sende auch an Widget
                window.dispatchEvent(new CustomEvent('domassist:embedded:message', {
                    detail: { message, source: 'embedded' }
                }));
                
                // Original-Funktion aufrufen
                return originalSendToN8N.call(this, message);
            };
        }
    }
    
    console.log('🚀 DomAssist Widget Enhanced initialisiert');
});

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DomAssistWidgetEnhanced, DOMASSIST_CONFIG };
}
