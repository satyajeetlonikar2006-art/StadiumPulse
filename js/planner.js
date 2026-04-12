/* ========================================
   StadiumPulse — Pre-Event Planner
   ======================================== */

const Planner = (() => {
    let currentStep = 1;
    let selectedTransport = '';
    let selectedBlock = '';
    let selectedRow = '';

    function init() {
        setupCountdown();
        setupWizard();
        setupTransportOptions();
        drawTransportMap();
    }

    // ---- COUNTDOWN ----
    function setupCountdown() {
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    function updateCountdown() {
        const now = new Date();
        const diff = STADIUM_CONFIG.eventDate - now;

        if (diff <= 0) {
            document.getElementById('cd-days').textContent = '00';
            document.getElementById('cd-hours').textContent = '00';
            document.getElementById('cd-mins').textContent = '00';
            document.getElementById('cd-secs').textContent = '00';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
        document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('cd-mins').textContent = String(mins).padStart(2, '0');
        document.getElementById('cd-secs').textContent = String(secs).padStart(2, '0');
    }

    // ---- WIZARD ----
    function setupWizard() {
        document.getElementById('btn-wizard-next-1')?.addEventListener('click', () => {
            selectedBlock = document.getElementById('plan-block').value;
            selectedRow = document.getElementById('plan-row').value;
            if (!selectedBlock) {
                UI.showToast('Please select a block', 'warning');
                return;
            }
            goToStep(2);
        });

        document.getElementById('btn-wizard-back-2')?.addEventListener('click', () => goToStep(1));
        document.getElementById('btn-wizard-next-2')?.addEventListener('click', () => {
            if (!selectedTransport) {
                UI.showToast('Please select a transport option', 'warning');
                return;
            }
            generatePlan();
            goToStep(3);
        });

        document.getElementById('btn-wizard-back-3')?.addEventListener('click', () => goToStep(2));
        document.getElementById('btn-wizard-save')?.addEventListener('click', () => {
            // Save to localStorage
            localStorage.setItem('stadiumPulse_plan', JSON.stringify({
                block: selectedBlock,
                row: selectedRow,
                transport: selectedTransport,
            }));
            UI.showToast('✅ Your visit plan has been saved!', 'success');
        });
    }

    function goToStep(step) {
        currentStep = step;
        document.querySelectorAll('.wizard-step').forEach(s => {
            const sNum = parseInt(s.dataset.step);
            s.classList.remove('active', 'completed');
            if (sNum === step) s.classList.add('active');
            if (sNum < step) s.classList.add('completed');
        });
        document.querySelectorAll('.wizard-page').forEach(p => {
            p.classList.toggle('active', parseInt(p.dataset.step) === step);
        });
    }

    // ---- TRANSPORT ----
    function setupTransportOptions() {
        document.querySelectorAll('.transport-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.transport-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedTransport = btn.dataset.transport;
            });
        });
    }

    // ---- PLAN GENERATION ----
    function generatePlan() {
        const planDiv = document.getElementById('visit-plan');
        if (!planDiv) return;

        const route = BLOCK_GATE_MAP[selectedBlock];
        const transportInfo = {
            metro: { arrival: 'Churchgate Station', dropoff: 'Metro Gate Exit 2', time: '18:00' },
            bus: { arrival: 'BEST Bus Stop — Marine Drive', dropoff: 'Gate C Bus Bay', time: '17:45' },
            cab: { arrival: 'Cab Drop Zone', dropoff: 'West Gate Drop-off', time: '18:15' },
            self: { arrival: 'Parking Lot 1 or 2', dropoff: 'Self-parking', time: '17:30' },
        };

        const info = transportInfo[selectedTransport] || transportInfo.metro;
        const steps = [
            { time: info.time, text: `Depart via ${selectedTransport} — arrive at ${info.arrival}`, icon: 'map-pin' },
            { time: addTime(info.time, 15), text: `Drop-off: ${info.dropoff}`, icon: 'log-in' },
            { time: addTime(info.time, 25), text: `Enter via ${route?.gate || 'Gate A'} — Security check`, icon: 'shield-check' },
            { time: addTime(info.time, 35), text: `Navigate to Block ${selectedBlock}${selectedRow ? `, Row ${selectedRow}` : ''}`, icon: 'navigation' },
            { time: addTime(info.time, 40), text: 'Settled in seat — Enjoy the match! 🏏', icon: 'armchair' },
        ];

        planDiv.innerHTML = steps.map(s => `
            <div class="plan-step">
                <span class="plan-time">${s.time}</span>
                <div class="plan-icon-wrap"><i data-lucide="${s.icon}"></i></div>
                <span>${s.text}</span>
            </div>
        `).join('');

        lucide.createIcons({ nodes: [planDiv] });
    }

    function addTime(timeStr, mins) {
        const [h, m] = timeStr.split(':').map(Number);
        const total = h * 60 + m + mins;
        const newH = Math.floor(total / 60) % 24;
        const newM = total % 60;
        return String(newH).padStart(2, '0') + ':' + String(newM).padStart(2, '0');
    }

    // ---- TRANSPORT MAP ----
    function drawTransportMap() {
        const svg = document.getElementById('transport-svg');
        if (!svg) return;

        svg.innerHTML = `
            <!-- Stadium outline -->
            <ellipse cx="400" cy="200" rx="120" ry="80" fill="rgba(0,212,255,0.08)" stroke="rgba(0,212,255,0.3)" stroke-width="2"/>
            <text x="400" y="205" text-anchor="middle" fill="rgba(0,212,255,0.6)" font-size="12" font-family="Orbitron">WANKHEDE</text>

            <!-- Gates -->
            <rect x="380" y="105" width="40" height="15" rx="3" fill="rgba(0,255,136,0.3)" stroke="rgba(0,255,136,0.5)"/>
            <text x="400" y="100" text-anchor="middle" fill="#00ff88" font-size="10">Gate A</text>

            <rect x="505" y="193" width="15" height="25" rx="3" fill="rgba(0,255,136,0.3)" stroke="rgba(0,255,136,0.5)"/>
            <text x="540" y="210" text-anchor="middle" fill="#00ff88" font-size="10">Gate B</text>

            <rect x="380" y="270" width="40" height="15" rx="3" fill="rgba(0,255,136,0.3)" stroke="rgba(0,255,136,0.5)"/>
            <text x="400" y="300" text-anchor="middle" fill="#00ff88" font-size="10">Gate C</text>

            <rect x="280" y="193" width="15" height="25" rx="3" fill="rgba(0,255,136,0.3)" stroke="rgba(0,255,136,0.5)"/>
            <text x="270" y="188" text-anchor="middle" fill="#00ff88" font-size="10">Gate D</text>

            <!-- Parking lots -->
            <rect x="80" y="50" width="100" height="60" rx="6" fill="rgba(0,212,255,0.06)" stroke="rgba(0,212,255,0.2)" stroke-dasharray="4"/>
            <text x="130" y="85" text-anchor="middle" fill="#00d4ff" font-size="10">🅿️ Lot 1</text>

            <rect x="620" y="290" width="100" height="60" rx="6" fill="rgba(0,212,255,0.06)" stroke="rgba(0,212,255,0.2)" stroke-dasharray="4"/>
            <text x="670" y="325" text-anchor="middle" fill="#00d4ff" font-size="10">🅿️ Lot 2</text>

            <!-- Metro -->
            <rect x="550" y="50" width="120" height="40" rx="6" fill="rgba(168,85,247,0.08)" stroke="rgba(168,85,247,0.3)"/>
            <text x="610" y="75" text-anchor="middle" fill="#a855f7" font-size="10">🚇 Metro Station</text>
            <line x1="550" y1="70" x2="500" y2="150" stroke="rgba(168,85,247,0.2)" stroke-width="1" stroke-dasharray="4"/>

            <!-- Bus stop -->
            <rect x="100" y="300" width="120" height="40" rx="6" fill="rgba(255,170,0,0.08)" stroke="rgba(255,170,0,0.3)"/>
            <text x="160" y="325" text-anchor="middle" fill="#ffaa00" font-size="10">🚌 Bus Stop</text>
            <line x1="220" y1="320" x2="280" y2="260" stroke="rgba(255,170,0,0.2)" stroke-width="1" stroke-dasharray="4"/>

            <!-- Cab zone -->
            <rect x="550" y="340" width="120" height="40" rx="6" fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.3)"/>
            <text x="610" y="365" text-anchor="middle" fill="#06b6d4" font-size="10">🚕 Cab Zone</text>
            <line x1="550" y1="360" x2="510" y2="260" stroke="rgba(6,182,212,0.2)" stroke-width="1" stroke-dasharray="4"/>
        `;
    }

    return { init };
})();
