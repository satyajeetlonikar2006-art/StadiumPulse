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

            function nextStep() {
                if (step >= LOAD_STEPS.length) {
                    setTimeout(resolve, 400);
                    return;
                }
                const s = LOAD_STEPS[step];
                if (fill) fill.style.width = s.pct + '%';
                if (status) status.textContent = s.text;
                step++;
                setTimeout(nextStep, 280 + Math.random() * 220);
            }

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
    document.addEventListener('DOMContentLoaded', async () => {
        // Run loading animation
        await runLoadingSequence();

        // Initialize all modules
        UI.init();
        StadiumMap.init();
        QueueTracker.init();
        AdminPanel.init();
        Analytics.init();
        Planner.init();
        Modals.init();
        Chatbot.init();
        LiveData.init();

        // Load saved preferences
        loadPreferences();

        // Setup navbar controls
        setupNavbarControls();

        // Subscribe to simulation updates
        SimEngine.subscribe(onSimulationUpdate);

        // Start simulation
        SimEngine.start();

        // Initialize Lucide icons
        lucide.createIcons();

        // Dismiss loading screen
        dismissLoader();

        console.log('🏟️ StadiumPulse initialized successfully!');
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
