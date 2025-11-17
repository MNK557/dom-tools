# 🤖 DomAssist Custom GPT Widget

Ein futuristisches, modernes Chat-Widget für Ihre HTML-Landingpage, das Ihren OpenAI Custom GPT über einen n8n Webhook integriert.

## 🎨 Features

### ✨ Design
- **Futuristisches Glassmorphism-Design** - Transparent, modern, beeindruckend
- **Neon-Glow-Effekte** - Leuchtende Animationen und Partikel
- **Smooth Animations** - Flüssige Übergänge und Hover-Effekte
- **Responsive Design** - Perfekt auf allen Geräten
- **Dark Mode** - Modernes dunkles Design

### 🚀 Funktionalität
- **Custom GPT Integration** - Verbindung zu Ihrem OpenAI Custom GPT
- **n8n Webhook** - Flexible Backend-Integration
- **Schnellaktionen** - Vordefinierte Buttons für häufige Anfragen
- **Chat-Historie** - Speichert Konversationen lokal
- **Typing Indicator** - Zeigt an, wenn der Bot antwortet
- **Programmatische API** - Steuern Sie das Widget per JavaScript

### 🎯 Business Features
- **Kundenfragen beantworten** - 24/7 automatisiert
- **Termine vereinbaren** - Direkt im Chat
- **Lead-Generierung** - Erfasst Kontaktdaten
- **Mehrsprachig** - Einfach anpassbar

## 📁 Dateien

```
dom-tools/
├── domassist-widget.css       # Widget Styling
├── domassist-widget.js        # Widget Funktionalität
├── WIDGET-ANLEITUNG.md        # Ausführliche Anleitung
├── WIDGET-README.md           # Dieses Dokument
├── widget-demo.html           # Demo-Seite zum Testen
└── index.html                 # Hauptseite mit Widget
```

## 🚀 Quick Start

### 1. Dateien einbinden

```html
<!-- In Ihre HTML-Datei vor </body> einfügen -->
<link rel="stylesheet" href="domassist-widget.css">
<script src="domassist-widget.js"></script>
<script>
    window.domassist = new DomAssistWidget({
        webhookUrl: 'IHRE_N8N_WEBHOOK_URL',
        assistantName: 'DomAssist',
        quickActions: [
            '📅 Termin vereinbaren',
            '💬 Frage stellen',
            'ℹ️ Informationen'
        ]
    });
</script>
```

### 2. N8N Webhook erstellen

1. Erstellen Sie einen Workflow in n8n
2. Fügen Sie einen Webhook Node hinzu (POST)
3. Verbinden Sie mit OpenAI GPT Node
4. Kopieren Sie die Webhook URL
5. Tragen Sie die URL in `webhookUrl` ein

### 3. Testen

Öffnen Sie `widget-demo.html` im Browser und testen Sie das Widget!

## 🎨 Anpassung

### Farben ändern

```javascript
window.domassist = new DomAssistWidget({
    primaryColor: '#YOUR_COLOR', // Ihre Markenfarbe
    // ...
});
```

### Schnellaktionen anpassen

```javascript
quickActions: [
    '📅 Termin buchen',
    '💰 Preise ansehen',
    '📞 Rückruf vereinbaren',
    'ℹ️ Mehr erfahren'
]
```

### Begrüßungsnachricht ändern

```javascript
welcomeMessage: 'Willkommen! Ich bin Ihr persönlicher Assistent.'
```

## 🔧 Erweiterte Konfiguration

### Vollständige Optionen

```javascript
window.domassist = new DomAssistWidget({
    // Backend
    webhookUrl: 'https://...',

    // Texte
    assistantName: 'DomAssist',
    welcomeMessage: 'Hallo! Wie kann ich helfen?',
    placeholderText: 'Nachricht eingeben...',

    // Quick Actions
    quickActions: ['...'],

    // Design
    primaryColor: '#14b8a6',
    position: 'bottom-right',

    // Features
    enableSound: true,
    saveHistory: true,
    autoOpen: false,
    showNotification: true
});
```

## 💻 Programmatische Steuerung

```javascript
// Widget öffnen
window.domassist.open();

// Widget schließen
window.domassist.close();

// Nachricht senden
window.domassist.sendCustomMessage('Hallo!');

// Historie löschen
window.domassist.clearHistory();
```

## 🔗 N8N Workflow Beispiel

### Einfacher Workflow

```
1. Webhook (Trigger)
   ↓
2. OpenAI Node (Custom GPT)
   ↓
3. Respond to Webhook
```

### Erweiterter Workflow mit Aktionen

```
1. Webhook (Trigger)
   ↓
2. OpenAI Node (Custom GPT)
   ↓
3. Function Node (Aktionserkennung)
   ↓
4. IF Node (Termin / Kontakt / Info)
   ↓
5. Airtable / Google Calendar / E-Mail
   ↓
6. Respond to Webhook
```

Siehe `WIDGET-ANLEITUNG.md` für Details!

## 📊 Webhook Format

### Request (vom Widget gesendet)

```json
{
  "message": "Ich möchte einen Termin vereinbaren",
  "sessionId": "session_123...",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "context": {
    "url": "https://ihre-website.de",
    "userAgent": "...",
    "language": "de"
  }
}
```

### Response (von n8n zurück)

```json
{
  "response": "Gerne! Wann passt es Ihnen?",
  "action": "open_calendar",
  "actionData": {
    "type": "appointment"
  }
}
```

## 🎯 Use Cases

### 1. Kundenservice
- FAQ automatisch beantworten
- 24/7 Verfügbarkeit
- Sofortige Antworten

### 2. Lead-Generierung
- Kontaktdaten erfassen
- Qualifizierung von Anfragen
- Weiterleitung an Vertrieb

### 3. Terminbuchung
- Automatische Terminvergabe
- Kalenderintegration
- Erinnerungen

### 4. E-Commerce Support
- Produktberatung
- Bestellstatus
- Retouren

## 🔒 Sicherheit

### Wichtige Hinweise:

✅ **CORS konfigurieren** - In n8n nur Ihre Domain erlauben
✅ **API Keys schützen** - Niemals im Frontend-Code!
✅ **Rate Limiting** - Schutz vor Missbrauch
✅ **Input Validation** - In n8n prüfen
✅ **HTTPS verwenden** - Sichere Verbindung

## 📱 Browser Support

- ✅ Chrome/Edge (Chromium) 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android)

## 🐛 Troubleshooting

### Widget wird nicht angezeigt?
- CSS/JS Dateien korrekt eingebunden?
- Browser-Konsole auf Fehler prüfen
- Z-index Konflikte?

### Keine Antworten vom Bot?
- Webhook URL korrekt?
- n8n Workflow aktiviert?
- Network Tab in DevTools checken
- CORS richtig konfiguriert?

### Styling-Probleme?
- CSS nach anderen Stylesheets laden
- !important flags hinzufügen falls nötig
- Browser-Cache leeren

## 📚 Weitere Ressourcen

- **WIDGET-ANLEITUNG.md** - Ausführliche Setup-Anleitung
- **widget-demo.html** - Live-Demo zum Testen
- **n8n Dokumentation** - https://docs.n8n.io
- **OpenAI API** - https://platform.openai.com/docs

## 💡 Tipps & Tricks

### Performance

- Aktivieren Sie Caching in n8n
- Verwenden Sie kurze Antworten
- Optimieren Sie Bilder im Chat

### UX-Verbesserungen

- Zeigen Sie Typing Indicator
- Nutzen Sie Quick Actions
- Geben Sie klare Fehlermeldungen

### Conversion-Optimierung

- Call-to-Actions einbauen
- Termin-Buttons prominent
- Social Proof integrieren

## 🎉 Fertig!

Ihr futuristisches Custom GPT Widget ist einsatzbereit!

Bei Fragen:
- 📧 support@domassist.de
- 💬 DomAssist Widget auf der Landingpage

---

**Erstellt für DomAssist** | Powered by OpenAI Custom GPT + n8n | Design by Claude
