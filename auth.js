// ═══════════════════════════════════════════════════════════
//  DOMASSIST PIN-SCHUTZ
// ═══════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  KONFIGURATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // PINs Base64-codiert (nicht perfekt sicher, aber besser als Klartext)
    // Für bessere Übersicht:
const PINS = {
    'NzU3NTc1NzU=': 'Dominik',
    'MzQzNDM0MzQ=': 'Franziska', 
    'ODk4OTg5ODk=': 'Philipp'
};

const VALID_PINS = Object.keys(PINS);

    // Session-Dauer in Stunden
    const SESSION_HOURS = 8;

    // Ausnahmen: Seiten die NICHT geschützt werden sollen
    const WHITELIST = [
    
    ];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  HAUPTLOGIK
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Prüfe ob aktuelle Seite auf Whitelist
    function isWhitelisted() {
        const path = window.location.pathname;
        return WHITELIST.some(whitePath => path.includes(whitePath));
    }

    // Prüfe ob gültige Session existiert
    function hasValidSession() {
        const session = localStorage.getItem('domassist_auth');
        if (!session) return false;

        try {
            const data = JSON.parse(session);
            const now = new Date().getTime();
            const expiry = new Date(data.expiry).getTime();

            if (now > expiry) {
                // Session abgelaufen
                localStorage.removeItem('domassist_auth');
                return false;
            }

            return true;
        } catch (e) {
            localStorage.removeItem('domassist_auth');
            return false;
        }
    }

    // PIN validieren
    function validatePIN(pin) {
        const encoded = btoa(pin);
        return VALID_PINS.includes(encoded);
    }

    // Session erstellen
    function createSession() {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + SESSION_HOURS);

        const session = {
            expiry: expiry.toISOString(),
            created: new Date().toISOString()
        };

        localStorage.setItem('domassist_auth', JSON.stringify(session));
        console.log('✅ Session erstellt bis:', expiry.toLocaleString('de-DE'));
    }

    // Logout
    function logout() {
        localStorage.removeItem('domassist_auth');
        location.reload();
    }

    // Modal erstellen und anzeigen
    function showPINModal() {
        // Seite blockieren
        document.body.style.overflow = 'hidden';

        // Modal HTML
        const modalHTML = `
            <div id="domassist-pin-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                ">
                    <div style="
                        font-size: 48px;
                        margin-bottom: 20px;
                    ">🔒</div>
                    
                    <h2 style="
                        margin: 0 0 10px 0;
                        color: #1e293b;
                        font-size: 24px;
                    ">Zugriff geschützt</h2>
                    
                    <p style="
                        margin: 0 0 30px 0;
                        color: #64748b;
                        font-size: 15px;
                    ">Bitte geben Sie Ihre PIN ein</p>
                    
                    <input 
                        type="password" 
                        id="domassist-pin-input" 
                        placeholder="PIN eingeben"
                        maxlength="10"
                        style="
                            width: 100%;
                            padding: 15px;
                            border: 2px solid #e2e8f0;
                            border-radius: 10px;
                            font-size: 18px;
                            text-align: center;
                            letter-spacing: 3px;
                            font-weight: bold;
                            margin-bottom: 20px;
                            box-sizing: border-box;
                        "
                    >
                    
                    <div id="domassist-pin-error" style="
                        color: #ef4444;
                        font-size: 14px;
                        margin-bottom: 20px;
                        min-height: 20px;
                        font-weight: 600;
                    "></div>
                    
                    <button id="domassist-pin-submit" style="
                        width: 100%;
                        padding: 15px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        🔓 Zugriff freischalten
                    </button>
                    
                    <p style="
                        margin: 25px 0 0 0;
                        color: #94a3b8;
                        font-size: 12px;
                    ">
                        DomAssist Consulting - Interner Bereich
                    </p>
                </div>
            </div>
        `;

        // Modal einfügen
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Event Listeners
        const input = document.getElementById('domassist-pin-input');
        const submitBtn = document.getElementById('domassist-pin-submit');
        const errorDiv = document.getElementById('domassist-pin-error');

        // Focus auf Input
        setTimeout(() => input.focus(), 100);

        // Submit Handler
        function handleSubmit() {
            const pin = input.value.trim();
            
            if (!pin) {
                errorDiv.textContent = '⚠️ Bitte PIN eingeben';
                input.focus();
                return;
            }

            if (validatePIN(pin)) {
                createSession();
                
                // Success Animation
                submitBtn.textContent = '✅ Zugriff gewährt!';
                submitBtn.style.background = '#10b981';
                
                setTimeout(() => {
                    document.getElementById('domassist-pin-modal').remove();
                    document.body.style.overflow = 'auto';
                }, 800);
            } else {
                // Error Animation
                errorDiv.textContent = '❌ Falsche PIN';
                input.value = '';
                input.style.borderColor = '#ef4444';
                input.style.animation = 'shake 0.5s';
                
                setTimeout(() => {
                    input.style.borderColor = '#e2e8f0';
                    input.style.animation = '';
                    errorDiv.textContent = '';
                }, 2000);
                
                input.focus();
            }
        }

        // Button Click
        submitBtn.addEventListener('click', handleSubmit);

        // Enter Key
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        });

        // Shake Animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(style);
    }

    // Logout Button hinzufügen (optional)
    function addLogoutButton() {
        const btn = document.createElement('button');
        btn.textContent = '🚪 Logout';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
            transition: all 0.3s;
        `;
        
        btn.addEventListener('mouseover', () => {
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.5)';
        });
        
        btn.addEventListener('mouseout', () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
        });
        
        btn.addEventListener('click', logout);
        
        document.body.appendChild(btn);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  INITIALISIERUNG
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Prüfung beim Laden
    if (isWhitelisted()) {
        console.log('ℹ️ Seite auf Whitelist - kein Schutz aktiv');
        return;
    }

    if (hasValidSession()) {
        console.log('✅ Gültige Session vorhanden');
        addLogoutButton(); // Optional
    } else {
        console.log('🔒 Keine gültige Session - PIN erforderlich');
        showPINModal();
    }

    // Session Check bei visibility change (Tab-Wechsel)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && !hasValidSession() && !isWhitelisted()) {
            showPINModal();
        }
    });

})();
