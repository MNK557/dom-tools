# 🤖 DomAssist Custom GPT Widget - Anleitung

## 📋 Übersicht

Dieses futuristische Chat-Widget verbindet Ihre HTML-Landingpage mit Ihrem Custom GPT von OpenAI über einen n8n Webhook.

## 🚀 Installation

### 1. Dateien einbinden

Fügen Sie folgende Zeilen **vor dem schließenden `</body>`-Tag** in Ihre HTML-Datei ein:

```html
<!-- DomAssist Widget CSS -->
<link rel="stylesheet" href="domassist-widget.css">

<!-- DomAssist Widget JS -->
<script src="domassist-widget.js"></script>
```

### 2. Widget initialisieren

**Option A: Einfache Initialisierung (Data Attributes)**

```html
<script
    src="domassist-widget.js"
    data-domassist-webhook="https://IHRE-N8N-WEBHOOK-URL.com/webhook/domassist"
    data-domassist-name="DomAssist"
    data-domassist-welcome="Hallo! Ich bin DomAssist. Wie kann ich helfen?"
    data-domassist-autoopen="false">
</script>
```

**Option B: Erweiterte Konfiguration (JavaScript)**

```html
<script src="domassist-widget.js"></script>
<script>
    // Widget mit eigener Konfiguration initialisieren
    window.domassist = new DomAssistWidget({
        // 🔗 N8N WEBHOOK URL (WICHTIG!)
        webhookUrl: 'https://IHRE-N8N-WEBHOOK-URL.com/webhook/domassist',

        // ⚙️ Widget Einstellungen
        assistantName: 'DomAssist',
        welcomeMessage: 'Hallo! Ich bin DomAssist, Ihr KI-Assistent. Wie kann ich Ihnen heute helfen?',
        placeholderText: 'Schreiben Sie eine Nachricht...',

        // 🎯 Schnellaktionen
        quickActions: [
            '📅 Termin vereinbaren',
            '💬 Frage stellen',
            'ℹ️ Informationen zu DomAssist',
            '📞 Kontakt aufnehmen',
            '💰 Preise & Pakete'
        ],

        // 🎨 Farben & Position
        primaryColor: '#14b8a6',
        position: 'bottom-right',

        // 🔧 Features
        enableSound: true,
        saveHistory: true,
        autoOpen: false,
        showNotification: true
    });
</script>
```

## 🔗 N8N Webhook Setup

### 1. N8N Workflow erstellen

Erstellen Sie einen neuen Workflow in n8n mit folgenden Nodes:

#### Node 1: Webhook (Trigger)
- **Method**: POST
- **Path**: `/webhook/domassist`
- **Response Mode**: Using Respond to Webhook Node

#### Node 2: OpenAI GPT Node
- **Resource**: Message
- **Operation**: Create
- **Model**: Ihr Custom GPT Model (z.B. `gpt-4` oder Ihr Custom GPT ID)
- **Messages**: `{{ $json.message }}`

Erweiterte Konfiguration für Custom GPT:
```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "Du bist DomAssist, ein hilfreicher KI-Assistent für die DomAssist-Landingpage. Du hilfst Kunden bei Fragen zu Automatisierung, Terminvereinbarungen und Services. Antworte freundlich, professionell und in deutscher Sprache."
    },
    {
      "role": "user",
      "content": "{{ $json.message }}"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

#### Node 3: Function Node (Optional - für spezielle Aktionen)
```javascript
// Erkenne spezielle Anfragen
const message = $input.item.json.message.toLowerCase();
let action = null;
let actionData = {};

if (message.includes('termin') || message.includes('vereinbaren')) {
    action = 'open_calendar';
    actionData = { type: 'appointment' };
}

if (message.includes('kontakt') || message.includes('anrufen')) {
    action = 'send_email';
    actionData = { type: 'contact_request' };
}

return {
    json: {
        response: $input.item.json.response,
        action: action,
        actionData: actionData
    }
};
```

#### Node 4: Respond to Webhook
- **Response Body**:
```json
{
  "response": "{{ $json.choices[0].message.content }}",
  "action": "{{ $json.action }}",
  "actionData": "{{ $json.actionData }}",
  "success": true
}
```

### 2. Webhook URL kopieren

Nach dem Aktivieren des Workflows erhalten Sie eine URL wie:
```
https://ihre-n8n-instanz.app.n8n.cloud/webhook/domassist
```

Diese URL tragen Sie in der Widget-Konfiguration ein.

## 📨 Webhook Request Format

Das Widget sendet folgendes JSON-Format an Ihren Webhook:

```json
{
  "message": "Benutzer-Nachricht hier",
  "sessionId": "session_1234567890_xyz",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "context": {
    "url": "https://ihre-website.de",
    "userAgent": "Mozilla/5.0...",
    "language": "de"
  }
}
```

## 📥 Webhook Response Format

Ihr Webhook sollte folgendes Format zurückgeben:

**Einfache Antwort:**
```json
{
  "response": "Hallo! Wie kann ich Ihnen helfen?"
}
```

**Mit Aktionen:**
```json
{
  "response": "Gerne helfe ich Ihnen bei der Terminvereinbarung!",
  "action": "open_calendar",
  "actionData": {
    "type": "appointment",
    "service": "beratung"
  }
}
```

### Verfügbare Aktionen:
- `open_calendar`: Öffnet Terminbuchung
- `send_email`: Sendet E-Mail
- `redirect`: Leitet zu URL weiter (benötigt `actionData.url`)

## 🎨 Anpassung des Designs

### Farben ändern

Passen Sie die Farben in `domassist-widget.css` an:

```css
/* Primärfarbe */
background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);

/* Zu Ihrer Markenfarbe ändern */
background: linear-gradient(135deg, #YOUR_COLOR 0%, #YOUR_DARKER_COLOR 100%);
```

### Avatar ändern

Im JavaScript (domassist-widget.js) oder direkt im HTML:

```html
<!-- Standard -->
<div class="domassist-avatar">🤖</div>

<!-- Eigenes Bild -->
<div class="domassist-avatar">
    <img src="ihr-logo.png" alt="DomAssist" style="width: 100%; height: 100%; object-fit: cover;">
</div>
```

## 🔧 Erweiterte Features

### Programmatischer Zugriff

```javascript
// Chat öffnen
window.domassist.open();

// Chat schließen
window.domassist.close();

// Nachricht senden
window.domassist.sendCustomMessage('Hallo vom Code!');

// Historie löschen
window.domassist.clearHistory();
```

### Event Listener

```javascript
// Nachdem Widget initialisiert wurde
window.addEventListener('load', () => {
    console.log('DomAssist Widget ist bereit!');
});
```

## 📱 Mobile Optimierung

Das Widget ist vollständig responsive und passt sich automatisch an:
- Desktop: 400px x 600px Widget
- Mobile: Vollbild-Chat

## 🔒 Sicherheit

**Wichtig für Produktion:**

1. **CORS konfigurieren** in n8n:
   - Erlauben Sie nur Ihre Domain

2. **Rate Limiting** in n8n einrichten

3. **API Keys schützen**:
   - Verwenden Sie n8n Credentials für OpenAI API Key
   - Niemals API Keys im Frontend-Code!

4. **Validierung** in n8n:
   ```javascript
   // In n8n Function Node
   if (!$json.message || $json.message.length > 1000) {
       return { error: 'Invalid message' };
   }
   ```

## 🧪 Testing

### Lokales Testen

1. Öffnen Sie `index.html` in einem Browser
2. Klicken Sie auf das Chat-Widget
3. Testen Sie verschiedene Nachrichten

### Test-Webhook

Für lokale Tests können Sie requestbin.com oder webhook.site verwenden:

```javascript
webhookUrl: 'https://webhook.site/ihre-test-id'
```

## 📊 Analytics & Tracking

Erweitern Sie das Widget mit Analytics:

```javascript
// In sendToWebhook()
gtag('event', 'chat_message_sent', {
    'event_category': 'DomAssist Chat',
    'event_label': message
});
```

## 🐛 Troubleshooting

### Widget wird nicht angezeigt
- ✅ CSS und JS korrekt eingebunden?
- ✅ Keine JavaScript-Fehler in der Konsole?
- ✅ Z-index Konflikte mit anderen Elementen?

### Webhook funktioniert nicht
- ✅ Webhook URL korrekt eingetragen?
- ✅ N8N Workflow aktiviert?
- ✅ CORS richtig konfiguriert?
- ✅ Network Tab in DevTools checken

### Nachrichten werden nicht angezeigt
- ✅ Response Format korrekt?
- ✅ JSON Format valide?
- ✅ Konsole auf Fehler prüfen

## 📞 Support

Bei Fragen:
- 📧 E-Mail: support@domassist.de
- 💬 Widget: Nutzen Sie das DomAssist Widget auf der Landingpage

## 🎉 Fertig!

Ihr futuristisches AI-Widget ist jetzt einsatzbereit! 🚀

---

**Erstellt für DomAssist** | Powered by OpenAI Custom GPT + n8n
