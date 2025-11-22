# DomAssist Widget Integration Guide

## 🚀 Übersicht

Diese Anleitung erklärt die Integration des DomAssist Widgets mit Ihrer index.html und die harmonisierte Webhook-Kommunikation.

## 📦 Dateien

1. **domassist-widget.css** - Styling für das Widget
2. **domassist-widget-extended.js** - Original Widget-Klasse
3. **domassist-widget-config.js** - Erweiterte Konfiguration mit Harmonisierung
4. **index.html** - Ihre Hauptseite mit eingebettetem Chat

## 🔧 Integration in index.html

Ersetzen Sie den aktuellen Widget-Code am Ende Ihrer index.html mit:

```html
<!-- DomAssist Widget Integration -->
<link rel="stylesheet" href="domassist-widget.css">
<script src="domassist-widget-extended.js"></script>
<script src="domassist-widget-config.js"></script>
```

## 📊 Vereinheitlichte Datenstruktur für n8n Webhook

Beide Chat-Systeme (eingebetteter Chat & Widget) senden jetzt folgende Struktur:

```json
{
    "message": "Nachrichtentext",
    "timestamp": "2025-01-15T10:30:00Z",
    "source": "DomAssist Widget - widget",
    "sessionId": "session_1234567890_abc123",
    "mode": "chat",
    
    "kontakt": {
        "name": "Max Mustermann",
        "email": "max@beispiel.de",
        "telefon": "+49 30 12345678",
        "firma": "Musterfirma GmbH"
    },
    
    "metadata": {
        "userAgent": "Mozilla/5.0...",
        "language": "de-DE",
        "referrer": "https://google.com",
        "currentUrl": "https://domassist.de",
        "dsgvoConsent": true,
        "hasContactData": true,
        "messageCount": 5,
        
        "leadScore": {
            "actions": 10,
            "engagement": 8,
            "contactProvided": true,
            "interestedInPackage": "BUSINESS",
            "appointmentRequested": true
        },
        
        "sessionDuration": 300000,
        
        "device": {
            "screenWidth": 1920,
            "screenHeight": 1080,
            "isMobile": false
        }
    },
    
    "history": [
        {
            "type": "user",
            "content": "Vorherige Nachricht",
            "timestamp": 1234567890
        }
    ]
}
```

## 🔄 Synchronisation zwischen Widget und eingebettetem Chat

Das System synchronisiert automatisch Nachrichten zwischen:
- Dem eingebetteten Chat in der Demo-Sektion
- Dem schwebenden Widget

### Events für Kommunikation:

```javascript
// Sende Nachricht vom eingebetteten Chat zum Widget
window.dispatchEvent(new CustomEvent('domassist:embedded:message', {
    detail: { message: 'Text', source: 'embedded' }
}));

// Sende Nachricht vom Widget zum eingebetteten Chat
window.dispatchEvent(new CustomEvent('domassist:widget:message', {
    detail: { message: 'Text', type: 'bot' }
}));
```

## 🎯 Features

### 1. Automatische Kontaktdaten-Extraktion
- E-Mail-Adressen
- Telefonnummern (deutsche Formate)
- Namen (mit deutschen Anreden)
- Firmennamen (mit Rechtsformen)

### 2. Lead-Scoring
Automatische Bewertung von Interessenten basierend auf:
- Anzahl der Interaktionen
- Kontaktdaten bereitgestellt
- Interesse an spezifischen Paketen
- Terminanfragen

### 3. DSGVO-Compliance
- Explizite Einwilligung erforderlich
- Daten können jederzeit gelöscht werden
- Session-basierte Speicherung

### 4. Voice-Support
- Sprachaufnahme direkt im Widget
- Automatische Transkription via n8n

## 🔌 n8n Webhook-Konfiguration

Ihr n8n Workflow sollte folgende Nodes haben:

1. **Webhook Node**
   - URL: `https://n8n.domassist.de/webhook/ecc1a840-b626-43ee-9825-0ae80d3feffd`
   - Method: POST
   - Response: JSON mit `response` Feld

2. **Switch Node** (Routing basierend auf `source`)
   - Case 1: "DomAssist Widget"
   - Case 2: "Embedded Chat Demo"
   - Case 3: "Termin Popup"

3. **Contact Extraction** (wenn `kontakt` vorhanden)
   - Speichern in Google Sheets
   - CRM-Update
   - E-Mail-Benachrichtigung

4. **AI Response Generation**
   - OpenAI/Claude API für Antworten
   - Kontext aus `history` verwenden

5. **Response Webhook**
   ```json
   {
       "response": "KI-generierte Antwort",
       "action": "optional_action",
       "actionData": {},
       "leadUpdate": {},
       "triggerTerminPopup": false,
       "syncToEmbedded": true
   }
   ```

## 📱 Mobile Optimierung

Das Widget passt sich automatisch an mobile Geräte an:
- Vollbild-Modus auf Smartphones
- Touch-optimierte Buttons
- Responsive Typography

## 🛠️ Debugging

Aktivieren Sie Debug-Logs in der Browser-Konsole:

```javascript
// Debug-Modus aktivieren
localStorage.setItem('domassist_debug', 'true');

// Kontaktdaten anzeigen
console.log(window.DomAssist.getContacts());

// Lead-Score anzeigen
console.log(window.DomAssist.getLeadScore());
```

## 📊 Analytics Integration

Falls Google Analytics vorhanden:

```javascript
// In n8n Response
{
    "analyticsEvent": {
        "action": "lead_qualified",
        "label": "BUSINESS Package",
        "value": 100
    }
}
```

## 🔒 Sicherheit

- Alle Daten werden verschlüsselt übertragen (HTTPS)
- XSS-Schutz durch HTML-Escaping
- CSRF-Token optional implementierbar
- Rate-Limiting über n8n konfigurierbar

## 🎨 Anpassung

### Farben ändern:
```javascript
new DomAssistWidgetEnhanced({
    primaryColor: '#14b8a6', // Ihre Markenfarbe
    // ...
});
```

### Schnellaktionen anpassen:
```javascript
quickActions: [
    '🚀 Demo anfordern',
    '💡 Features erkunden',
    '📈 ROI berechnen'
]
```

## 📈 Erweiterte Integration

### Termin-Popup triggern:
```javascript
window.DomAssist.on('appointment_requested', (event) => {
    window.openTerminPopup();
});
```

### Lead an CRM senden:
```javascript
window.DomAssist.on('lead_qualified', (event) => {
    const leadData = event.detail;
    // Sende an Ihr CRM
});
```

## 🚨 Häufige Probleme

### Widget wird nicht angezeigt:
- Prüfen Sie, ob alle JS/CSS-Dateien geladen werden
- Überprüfen Sie die Browser-Konsole auf Fehler
- Stellen Sie sicher, dass die Webhook-URL korrekt ist

### Nachrichten kommen nicht an:
- Überprüfen Sie die n8n Webhook-URL
- Prüfen Sie CORS-Einstellungen
- Kontrollieren Sie die Browser-Netzwerk-Registerkarte

### DSGVO-Popup erscheint nicht:
- `enableDSGVO: true` muss gesetzt sein
- LocalStorage muss verfügbar sein
- Datenschutz-URL muss erreichbar sein

## 📞 Support

Bei Fragen oder Problemen:
- E-Mail: support@domassist.de
- Dokumentation: https://docs.domassist.de
- n8n Community: https://community.n8n.io

## 📝 Changelog

### Version 2.0.0 (Januar 2025)
- ✅ Harmonisierte Webhook-Kommunikation
- ✅ Lead-Scoring System
- ✅ Erweiterte Kontaktdaten-Extraktion
- ✅ Synchronisation mit eingebettetem Chat
- ✅ Voice-Support
- ✅ DSGVO-Compliance

## 🎯 Nächste Schritte

1. Testen Sie die Integration lokal
2. Konfigurieren Sie Ihren n8n Workflow
3. Passen Sie die Schnellaktionen an
4. Aktivieren Sie Analytics-Tracking
5. Implementieren Sie Lead-Routing

---

**DomAssist** - Intelligente Automatisierung für Ihr Unternehmen
