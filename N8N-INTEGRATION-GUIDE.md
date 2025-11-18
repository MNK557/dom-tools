# 🔗 n8n Integration Guide - DomAssist Widget Extended

Vollständige Anleitung für die Integration des erweiterten DomAssist Widgets mit n8n und OpenAI Custom GPT.

## 📋 Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [N8N Workflow Setup](#n8n-workflow-setup)
3. [Intent Detection](#intent-detection)
4. [Datenerfassung Trigger](#datenerfassung-trigger)
5. [Voice Integration](#voice-integration)
6. [Testing & Debugging](#testing--debugging)

---

## 🎯 Übersicht

### Was ist neu?

**Erweiterte Features:**
- ✅ **DSGVO Consent Management** - Vor erstem Chat-Start
- ✅ **Intelligente Datenerfassung** - Dynamische Formulare basierend auf Intent
- ✅ **Voice/Chat Toggle** - Sprachemingabe mit Audio-Transkription
- ✅ **Erweiterte JSON-Struktur** - Komplette Payload mit Metadaten

### Request-Flow

```
User öffnet Widget
    ↓
[DSGVO Consent Popup]
    ↓ (Accept)
Chat startet
    ↓
User schreibt Nachricht / spricht
    ↓
→ n8n Webhook empfängt Request
    ↓
→ OpenAI GPT analysiert (Intent Detection)
    ↓
→ Falls Intent benötigt Daten:
      Widget zeigt Formular
      User füllt aus → Erneuter Request mit Daten
    ↓
→ n8n verarbeitet & speichert
    ↓
← Response zurück an Widget
```

---

## 🔧 N8N Workflow Setup

### Workflow Übersicht

```
1. Webhook Trigger (POST)
   ↓
2. JSON Parser (Request aufteilen)
   ↓
3. IF: Audio-Modus?
   ├── JA → Whisper API (Transkription)
   └── NEIN → Weiter zu GPT
   ↓
4. OpenAI GPT Node (Intent Detection + Antwort)
   ↓
5. Function: Intent Parser
   ↓
6. IF: Daten erforderlich?
   ├── JA → Response mit "show_form" action
   └── NEIN → Normale Response
   ↓
7. IF: Kontaktdaten vorhanden?
   ├── JA → Speichern (Airtable/Sheets/CRM)
   └── NEIN → Überspringen
   ↓
8. Optional: 11Labs (Text-to-Speech)
   ↓
9. Respond to Webhook
```

---

## 📨 JSON Payload Struktur

### Standard Chat Request

```json
{
  "meta": {
    "sessionId": "session_1731888000000_abc123",
    "timestamp": "2025-11-18T10:30:00.000Z",
    "dsgvoConsent": true,
    "mode": "chat",
    "intent": null,
    "source": "landing-page-widget"
  },
  "kontakt": {},
  "anfrage": {
    "typ": "CHAT",
    "nachricht": "Ich möchte einen Termin vereinbaren",
    "details": {}
  },
  "audioData": null
}
```

### Voice Request

```json
{
  "meta": {
    "sessionId": "session_1731888000000_abc123",
    "timestamp": "2025-11-18T10:31:00.000Z",
    "dsgvoConsent": true,
    "mode": "voice",
    "intent": null,
    "source": "landing-page-widget"
  },
  "kontakt": {},
  "anfrage": {
    "typ": "CHAT",
    "nachricht": "🎤 Voice Message",
    "details": {}
  },
  "audioData": "base64-encoded-webm-audio-string..."
}
```

### Complete Request (mit Kontaktdaten)

```json
{
  "meta": {
    "sessionId": "session_1731888000000_abc123",
    "timestamp": "2025-11-18T10:35:00.000Z",
    "dsgvoConsent": true,
    "mode": "chat",
    "intent": "TERMIN",
    "source": "landing-page-widget"
  },
  "kontakt": {
    "name": "Max Mustermann",
    "email": "max@musterfirma.de",
    "firma": "Musterfirma GmbH",
    "telefon": "+49 123 456789",
    "mitarbeiter": "Sarah Schmidt"
  },
  "anfrage": {
    "typ": "TERMIN",
    "nachricht": "Ich benötige eine Demo für unser Team",
    "details": {
      "datum": "2025-11-25",
      "uhrzeit": "14:00",
      "terminArt": "Beratung"
    }
  },
  "audioData": null
}
```

---

## 🔍 N8N Workflow - Schritt für Schritt

### Node 1: Webhook (Trigger)

**Settings:**
- **HTTP Method**: POST
- **Path**: `/webhook/domassist`
- **Authentication**: None (oder Basic Auth)
- **Response Mode**: Using "Respond to Webhook" Node

**Output:**
```json
{
  "body": { /* Widget Payload */ },
  "headers": { ... },
  "query": {}
}
```

---

### Node 2: Function - Request Parser

**Code:**
```javascript
// Parse incoming request
const body = $input.item.json.body;

return {
  json: {
    sessionId: body.meta.sessionId,
    timestamp: body.meta.timestamp,
    mode: body.meta.mode,
    intent: body.meta.intent,
    dsgvoConsent: body.meta.dsgvoConsent,

    // User message
    userMessage: body.anfrage.nachricht,

    // Contact data (if available)
    hasContactData: Object.keys(body.kontakt || {}).length > 0,
    kontakt: body.kontakt || {},

    // Request details
    anfrage: body.anfrage,

    // Audio data
    isVoiceMode: body.meta.mode === 'voice',
    audioData: body.audioData
  }
};
```

---

### Node 3: IF - Voice Mode Check

**Condition:**
```javascript
{{ $json.isVoiceMode }} === true
```

**True Branch → Whisper API Node**

---

### Node 4: Whisper API (OpenAI) - Audio Transkription

**Settings:**
- **Operation**: Transcribe
- **File**: Base64 Audio Data
- **Model**: whisper-1
- **Language**: de (Deutsch)

**Expression for Audio File:**
```javascript
{{
  $json.audioData
}}
```

**Output:**
```json
{
  "text": "Ich möchte einen Termin für nächste Woche vereinbaren"
}
```

**Function Node nach Whisper - Merge Text:**
```javascript
// Replace user message with transcribed text
const transcribedText = $json.text;

return {
  json: {
    ...$('Function').item.json,
    userMessage: transcribedText
  }
};
```

---

### Node 5: OpenAI GPT Node - Intent Detection & Response

**Settings:**
- **Resource**: Message
- **Operation**: Create
- **Model**: gpt-4 (oder gpt-4-turbo)

**System Message:**
```
Du bist DomAssist, ein intelligenter KI-Assistent für Automatisierung und Terminvereinbarungen.

Deine Aufgaben:
1. Beantworte Kundenfragen freundlich und professionell
2. Erkenne den INTENT der Anfrage:
   - TERMIN: User möchte einen Termin vereinbaren
   - ANGEBOT: User möchte ein Angebot/Preise
   - AUFTRAG: User möchte direkt beauftragen
   - SUPPORT: User hat ein Problem/Frage
   - INFO: Allgemeine Informationen

3. Falls Intent TERMIN, ANGEBOT oder AUFTRAG:
   → Erwähne, dass du noch einige Informationen benötigst
   → Antworte: "Gerne! Um Ihnen zu helfen, benötige ich noch einige Infos. Bitte füllen Sie das Formular aus."

4. Antworte IMMER auf Deutsch
5. Sei freundlich, hilfsbereit und präzise

WICHTIG: Deine Antwort muss IMMER folgendes JSON-Format haben:
{
  "response": "Deine Antwort an den User",
  "intent": "TERMIN|ANGEBOT|AUFTRAG|SUPPORT|INFO|null",
  "confidence": 0.95
}
```

**User Message:**
```javascript
{{ $json.userMessage }}
```

**Output Settings:**
- **Response Format**: JSON

**Example Output:**
```json
{
  "response": "Gerne helfe ich Ihnen bei der Terminvereinbarung! Um Ihnen zu helfen, benötige ich noch einige Informationen. Bitte füllen Sie das folgende Formular aus.",
  "intent": "TERMIN",
  "confidence": 0.98
}
```

---

### Node 6: Function - Intent Response Builder

**Code:**
```javascript
// Parse GPT Response
const gptResponse = JSON.parse($json.choices[0].message.content);
const hasContactData = $('Function').item.json.hasContactData;
const intent = gptResponse.intent;

// Build response payload
let response = {
  response: gptResponse.response,
  intent: intent,
  action: null,
  actionData: null
};

// If intent requires data and we don't have it yet
if (['TERMIN', 'ANGEBOT', 'AUFTRAG'].includes(intent) && !hasContactData) {
  response.action = 'show_form';
  response.actionData = {
    intent: intent
  };
}

// If we have contact data, proceed with processing
if (hasContactData) {
  const kontakt = $('Function').item.json.kontakt;
  const anfrage = $('Function').item.json.anfrage;

  response.response = `✅ Vielen Dank, ${kontakt.name}! `;

  if (intent === 'TERMIN') {
    response.response += `Ihr Termin am ${anfrage.details.datum} um ${anfrage.details.uhrzeit} wurde vorgemerkt. Wir senden Ihnen eine Bestätigung an ${kontakt.email}.`;
  } else if (intent === 'ANGEBOT') {
    response.response += `Wir erstellen Ihnen ein individuelles Angebot und senden es an ${kontakt.email}.`;
  } else if (intent === 'AUFTRAG') {
    response.response += `Ihre Anfrage wurde an unser Team weitergeleitet. Wir melden uns in Kürze bei Ihnen.`;
  }
}

return {
  json: response
};
```

---

### Node 7: IF - Has Contact Data?

**Condition:**
```javascript
{{ $('Function').item.json.hasContactData }} === true
```

**True Branch → Save to Database**

---

### Node 8a: Airtable Node - Save Contact

**Settings:**
- **Operation**: Append
- **Table**: Leads / Contacts
- **Fields**:
  - Name: `{{ $('Function').item.json.kontakt.name }}`
  - Email: `{{ $('Function').item.json.kontakt.email }}`
  - Firma: `{{ $('Function').item.json.kontakt.firma }}`
  - Telefon: `{{ $('Function').item.json.kontakt.telefon }}`
  - Intent: `{{ $json.intent }}`
  - Nachricht: `{{ $('Function').item.json.anfrage.nachricht }}`
  - Datum: `{{ $('Function').item.json.anfrage.details.datum }}`
  - Uhrzeit: `{{ $('Function').item.json.anfrage.details.uhrzeit }}`
  - Session ID: `{{ $('Function').item.json.sessionId }}`
  - Timestamp: `{{ $('Function').item.json.timestamp }}`

---

### Node 8b: Google Calendar Node - Create Event (für TERMIN)

**Condition (vor dem Node):**
```javascript
{{ $json.intent }} === 'TERMIN'
```

**Settings:**
- **Operation**: Create Event
- **Calendar**: Primary
- **Start**: `{{ $('Function').item.json.anfrage.details.datum }}T{{ $('Function').item.json.anfrage.details.uhrzeit }}:00`
- **Summary**: `Termin: {{ $('Function').item.json.kontakt.name }}`
- **Description**:
  ```
  Kontakt: {{ $('Function').item.json.kontakt.name }}
  Email: {{ $('Function').item.json.kontakt.email }}
  Firma: {{ $('Function').item.json.kontakt.firma }}
  Telefon: {{ $('Function').item.json.kontakt.telefon }}

  Nachricht:
  {{ $('Function').item.json.anfrage.nachricht }}
  ```

---

### Node 9: Send Email Notification (Optional)

**Email (Send Email) Node:**
- **To**: `{{ $('Function').item.json.kontakt.email }}`
- **Subject**: `Ihre Anfrage bei DomAssist - {{ $json.intent }}`
- **Message**:
  ```
  Hallo {{ $('Function').item.json.kontakt.name }},

  vielen Dank für Ihre Anfrage!

  {{ $json.response }}

  Wir freuen uns auf die Zusammenarbeit.

  Mit freundlichen Grüßen,
  Ihr DomAssist Team
  ```

---

### Node 10: 11Labs Text-to-Speech (Optional für Voice Mode)

**Condition:**
```javascript
{{ $('Function').item.json.mode }} === 'voice'
```

**11Labs API Node:**
- **Method**: POST
- **URL**: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **Headers**:
  - `xi-api-key`: YOUR_11LABS_API_KEY
  - `Content-Type`: application/json
- **Body**:
  ```json
  {
    "text": "{{ $json.response }}",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }
  ```

**Function Node - Convert to Base64:**
```javascript
const audioBuffer = $binary.data;
const base64Audio = audioBuffer.toString('base64');

return {
  json: {
    ...$json,
    audioUrl: `data:audio/mpeg;base64,${base64Audio}`
  }
};
```

---

### Node 11: Respond to Webhook (Final)

**Response:**

**Standard (Text):**
```json
{
  "response": "{{ $json.response }}",
  "intent": "{{ $json.intent }}",
  "action": "{{ $json.action }}",
  "actionData": {{ $json.actionData }}
}
```

**Voice Mode (mit Audio):**
```json
{
  "response": "{{ $json.response }}",
  "intent": "{{ $json.intent }}",
  "audioUrl": "{{ $json.audioUrl }}",
  "action": "{{ $json.action }}",
  "actionData": {{ $json.actionData }}
}
```

---

## 🧪 Testing & Debugging

### Test Request 1: Erste Nachricht (ohne Daten)

```bash
curl -X POST https://your-n8n-instance.com/webhook/domassist \
  -H "Content-Type: application/json" \
  -d '{
    "meta": {
      "sessionId": "test_session_123",
      "timestamp": "2025-11-18T10:00:00Z",
      "dsgvoConsent": true,
      "mode": "chat",
      "intent": null,
      "source": "test"
    },
    "kontakt": {},
    "anfrage": {
      "typ": "CHAT",
      "nachricht": "Ich möchte einen Termin vereinbaren",
      "details": {}
    },
    "audioData": null
  }'
```

**Expected Response:**
```json
{
  "response": "Gerne! Um Ihnen zu helfen, benötige ich noch einige Infos. Bitte füllen Sie das Formular aus.",
  "intent": "TERMIN",
  "action": "show_form",
  "actionData": {
    "intent": "TERMIN"
  }
}
```

---

### Test Request 2: Mit vollständigen Kontaktdaten

```bash
curl -X POST https://your-n8n-instance.com/webhook/domassist \
  -H "Content-Type: application/json" \
  -d '{
    "meta": {
      "sessionId": "test_session_123",
      "timestamp": "2025-11-18T10:05:00Z",
      "dsgvoConsent": true,
      "mode": "chat",
      "intent": "TERMIN",
      "source": "test"
    },
    "kontakt": {
      "name": "Max Mustermann",
      "email": "max@test.de",
      "firma": "Test GmbH",
      "telefon": "+49 123 456789",
      "mitarbeiter": null
    },
    "anfrage": {
      "typ": "TERMIN",
      "nachricht": "Demo für unser Team",
      "details": {
        "datum": "2025-11-25",
        "uhrzeit": "14:00",
        "terminArt": "Beratung"
      }
    },
    "audioData": null
  }'
```

**Expected Response:**
```json
{
  "response": "✅ Vielen Dank, Max Mustermann! Ihr Termin am 2025-11-25 um 14:00 wurde vorgemerkt. Wir senden Ihnen eine Bestätigung an max@test.de.",
  "intent": "TERMIN",
  "action": null,
  "actionData": null
}
```

---

## 🔒 Security Best Practices

### 1. CORS Configuration

In n8n Webhook Settings:
```
Allowed Origins: https://your-domain.com
```

### 2. Rate Limiting

Add Function Node before Webhook Processing:
```javascript
// Simple rate limiting by session
const sessionId = $json.body.meta.sessionId;
const now = Date.now();

// Check if session exists in cache
const lastRequest = $getWorkflowStaticData('global')[sessionId];

if (lastRequest && (now - lastRequest) < 2000) {
  // Less than 2 seconds since last request
  throw new Error('Rate limit exceeded');
}

// Update cache
$getWorkflowStaticData('global')[sessionId] = now;

return $input.all();
```

### 3. Input Validation

```javascript
// Validate request structure
const body = $json.body;

if (!body.meta || !body.meta.sessionId) {
  throw new Error('Invalid request: missing sessionId');
}

if (!body.meta.dsgvoConsent) {
  throw new Error('DSGVO consent required');
}

if (body.kontakt && body.kontakt.email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.kontakt.email)) {
    throw new Error('Invalid email format');
  }
}

return $input.all();
```

### 4. Sanitize Input

```javascript
// Sanitize user message
function sanitize(str) {
  return str.replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .trim();
}

const userMessage = sanitize($json.body.anfrage.nachricht);

return {
  json: {
    ...$json,
    sanitizedMessage: userMessage
  }
};
```

---

## 📊 Analytics & Logging

### Custom Logging Node

```javascript
// Log all requests for analytics
const log = {
  timestamp: new Date().toISOString(),
  sessionId: $json.sessionId,
  intent: $json.intent,
  mode: $json.mode,
  hasContactData: $json.hasContactData,
  userAgent: $json.headers['user-agent'],
  ipAddress: $json.headers['x-forwarded-for'] || $json.headers['x-real-ip']
};

// Send to Google Sheets / Analytics DB
return {
  json: log
};
```

---

## ✅ Checklist für Produktions-Deployment

- [ ] Webhook URL in Widget konfiguriert
- [ ] OpenAI API Key in n8n hinterlegt
- [ ] DSGVO-konformes Logging implementiert
- [ ] Rate Limiting aktiviert
- [ ] CORS richtig konfiguriert
- [ ] Error Handling für alle Nodes
- [ ] Email-Benachrichtigungen getestet
- [ ] Kalender-Integration getestet
- [ ] Voice-Transkription getestet (Whisper)
- [ ] 11Labs Voice Response getestet
- [ ] Datenbank-Speicherung getestet
- [ ] Backup-Strategie für Workflow
- [ ] Monitoring & Alerting eingerichtet

---

## 🚀 Next Steps

1. **Workflow importieren**: Nutzen Sie das mitgelieferte JSON-Template
2. **API Keys konfigurieren**: OpenAI, 11Labs, Airtable, etc.
3. **Testen**: Mit curl oder Postman
4. **Widget URL aktualisieren**: In index.html
5. **Go Live**: Deploy auf Ihrer Domain

---

**Erstellt für DomAssist** | Powered by n8n + OpenAI + 11Labs
