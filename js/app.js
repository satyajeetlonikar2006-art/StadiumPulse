/* ========================================
   StadiumPulse — Main App Controller
   ======================================== */

(function App() {
    'use strict';

    // Track charts initialized state
    let chartsInitialized = false;

    // ---- LOADING SEQUENCE ----
    const LOAD_STEPS = [
        { pct: 10,  text: 'Initializing systems...' },
        { pct: 20,  text: 'Loading stadium map...' },
        { pct: 35,  text: 'Connecting to sensors...' },
        { pct: 50,  text: 'Loading crowd data...' },
        { pct: 65,  text: 'Calibrating heatmaps...' },
        { pct: 78,  text: 'Starting simulation engine...' },
        { pct: 90,  text: 'Rendering interface...' },
        { pct: 100, text: 'Welcome to StadiumPulse! 🏟️' },
    ];

    function runLoadingSequence() {
        return new Promise(resolve => {
            const fill = document.getElementById('loader-progress-fill');
            const status = document.getElementById('loader-status');
            let step = 0;
            let sequenceResolved = false;

            function nextStep() {
                if (sequenceResolved) return;
                
                if (step >= LOAD_STEPS.length) {
                    sequenceResolved = true;
                    setTimeout(resolve, 400);
                    return;
                }
                const s = LOAD_STEPS[step];
                if (fill) fill.style.width = s.pct + '%';
                if (status) status.textContent = s.text;
                step++;
                setTimeout(nextStep, 280 + Math.random() * 220);
            }

            // Final fallback resolve after 10s if the steps get stuck
            setTimeout(() => {
                if (!sequenceResolved) {
                    sequenceResolved = true;
                    resolve();
                }
            }, 10000);

            nextStep();
        });
    }

    function dismissLoader() {
        const loader = document.getElementById('loading-screen');
        if (!loader) return;
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 900);
    }

    // ---- INIT ----
    document.addEventListener('DOMContentLoaded', () => {
        // Run loading animation (non-blocking)
        runLoadingSequence().then(() => {
            console.log('Loader animation complete');
        });

        // Fail-safe: dismiss loader after 5 seconds no matter what
        const failSafeTimeout = setTimeout(() => {
            console.warn('⚠️ Forced loader dismissal...');
            dismissLoader();
        }, 5000);

        try {
            // Initialize all modules with individual safety
            const safeInit = (name, fn) => {
                try {
                    fn();
                } catch (e) {
                    console.error(`[App] ${name} init failed:`, e);
                }
            };

            safeInit('UI',          () => UI.init());
            safeInit('StadiumMap',  () => StadiumMap.init());
            safeInit('QueueTracker',() => QueueTracker.init());
            safeInit('AdminPanel',  () => AdminPanel.init());
            safeInit('Analytics',   () => Analytics.init());
            safeInit('Planner',     () => Planner.init());
            safeInit('Modals',      () => Modals.init());
            safeInit('Chatbot',     () => Chatbot.init());
            safeInit('LiveData',    () => LiveData.init());

            // Core features
            safeInit('Prefs',       () => loadPreferences());
            safeInit('Navbar',      () => setupNavbarControls());
            
            // Simulation
            try {
                SimEngine.subscribe(onSimulationUpdate);
                SimEngine.start();
            } catch (e) { console.error('[App] SimEngine failed:', e); }

            // Lucide
            if (typeof lucide !== 'undefined') {
                try { lucide.createIcons(); } catch (e) {}
            }

            // If we got here fast, clear fail-safe and dismiss
            clearTimeout(failSafeTimeout);
            dismissLoader();
            console.log('🏟️ StadiumPulse initialized successfully!');

        } catch (err) {
            console.error('❌ Critical initialization error:', err);
            clearTimeout(failSafeTimeout);
            dismissLoader();
        }
    });

    // ---- SIMULATION UPDATE HANDLER ----
    function onSimulationUpdate(snapshot) {
        UI.onSimUpdate(snapshot);
        QueueTracker.update(snapshot);
        AdminPanel.update(snapshot);

        // Only update analytics charts when the analytics tab is visible
        if (document.getElementById('panel-analytics')?.classList.contains('active')) {
            if (!chartsInitialized) {
                Analytics.initCharts();
                chartsInitialized = true;
            }
            Analytics.update(snapshot);
        }
    }

    // ---- NAVBAR CONTROLS ----
    function setupNavbarControls() {
        // Accessibility toggle
        document.getElementById('btn-accessibility')?.addEventListener('click', () => {
            const html = document.documentElement;
            const current = html.dataset.theme;
            html.dataset.theme = current === 'high-contrast' ? 'dark' : 'high-contrast';
            const mode = html.dataset.theme === 'high-contrast' ? 'High Contrast' : 'Default';
            UI.showToast(`Accessibility: ${mode} mode activated`, 'info');
            localStorage.setItem('stadiumPulse_theme', html.dataset.theme);
        });

        // Language selector
        document.getElementById('btn-language')?.addEventListener('click', () => {
            Modals.open('modal-language');
        });

        // Language options
        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.lang-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const lang = btn.dataset.lang;
                document.getElementById('btn-language').querySelector('.lang-label').textContent = lang.toUpperCase();
                localStorage.setItem('stadiumPulse_lang', lang);
                applyLanguage(lang);
                Modals.close('modal-language');
                UI.showToast(`Language changed to ${btn.textContent.trim()}`, 'success');
            });
        });

        // Fast forward
        let isFastForward = false;
        document.getElementById('btn-fast-forward')?.addEventListener('click', () => {
            isFastForward = !isFastForward;
            SimEngine.setFastForward(isFastForward);
            SimEngine.restart();
            const btn = document.getElementById('btn-fast-forward');
            btn.style.color = isFastForward ? 'var(--accent-green)' : '';
            UI.showToast(isFastForward ? '⏩ Fast forward enabled — 10x speed!' : '▶️ Normal speed resumed', 'info');
        });

        // Notifications
        document.getElementById('btn-notifications')?.addEventListener('click', () => {
            Modals.open('modal-notifications');
        });

        // Analytics tab lazy init
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.tab === 'analytics' && !chartsInitialized) {
                    setTimeout(() => {
                        Analytics.initCharts();
                        chartsInitialized = true;
                        Analytics.update(SimEngine.getSnapshot());
                    }, 100);
                }
            });
        });

        // AR demo button has been replaced by functional AR logic

    }

    // ---- LANGUAGE ----
    function applyLanguage(lang) {
        const t = TRANSLATIONS[lang];
        if (!t) return;

        // Update tab labels
        const tabLabels = ['liveMap', 'queues', 'admin', 'analytics', 'planner', 'more'];
        document.querySelectorAll('.tab-btn span').forEach((span, i) => {
            if (t[tabLabels[i]]) span.textContent = t[tabLabels[i]];
        });
    }

    // ---- PREFERENCES ----
    function loadPreferences() {
        // Theme
        const savedTheme = localStorage.getItem('stadiumPulse_theme');
        if (savedTheme) document.documentElement.dataset.theme = savedTheme;

        // Language
        const savedLang = localStorage.getItem('stadiumPulse_lang');
        if (savedLang) {
            document.querySelectorAll('.lang-option').forEach(b => {
                b.classList.toggle('active', b.dataset.lang === savedLang);
            });
            document.getElementById('btn-language').querySelector('.lang-label').textContent = savedLang.toUpperCase();
            applyLanguage(savedLang);
        }

        // Saved plan
        const savedPlan = localStorage.getItem('stadiumPulse_plan');
        if (savedPlan) {
            try {
                const plan = JSON.parse(savedPlan);
                if (plan.block) document.getElementById('seat-block').value = plan.block;
            } catch (e) {}
        }
    }
})();
