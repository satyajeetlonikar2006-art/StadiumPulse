/* ========================================
   StadiumPulse — Admin Panel
   ======================================== */

const AdminPanel = (() => {

    function init() {
        setupGateControls();
        setupBroadcast();
        setupEvacuation();
        setupSOS();
        setupToggle();
    }

    function setupGateControls() {
        const container = document.getElementById('gate-controls');
        if (!container) return;

        const gates = ZONES.filter(z => z.type === 'gates');
        container.innerHTML = '';

        gates.forEach(gate => {
            const row = document.createElement('div');
            row.className = 'gate-control-row';
            row.innerHTML = `
                <div class="gate-name">
                    <span class="gate-status-dot open" data-gate-dot="${gate.id}"></span>
                    <span>${gate.name}</span>
                </div>
                <div class="toggle-switch active" data-gate-toggle="${gate.id}"></div>
            `;

            row.querySelector(`[data-gate-toggle="${gate.id}"]`).addEventListener('click', () => {
                SimEngine.toggleGate(gate.id);
                updateGateUI();
            });

            container.appendChild(row);
        });
    }

    function updateGateUI() {
        const snap = SimEngine.getSnapshot();
        Object.entries(snap.gates).forEach(([gateId, isOpen]) => {
            const dot = document.querySelector(`[data-gate-dot="${gateId}"]`);
            const toggle = document.querySelector(`[data-gate-toggle="${gateId}"]`);
            if (dot) {
                dot.className = `gate-status-dot ${isOpen ? 'open' : 'closed'}`;
            }
            if (toggle) {
                toggle.classList.toggle('active', isOpen);
            }
        });
    }

    function setupBroadcast() {
        const btn = document.getElementById('btn-broadcast');
        if (btn) {
            btn.addEventListener('click', () => {
                const zone = document.getElementById('broadcast-zone').value;
                const msg = document.getElementById('broadcast-msg').value.trim();
                if (!msg) {
                    UI.showToast('Please enter a broadcast message', 'warning');
                    return;
                }
                SimEngine.broadcastAlert(zone, msg);
                document.getElementById('broadcast-msg').value = '';
                UI.showToast('Alert broadcast successfully!', 'success');
                UI.addAlert(`📢 Broadcast: ${msg}`);
            });
        }
    }

    function setupSOS() {
        const btn = document.getElementById('btn-sos');
        if (btn) {
            btn.addEventListener('click', () => {
                if (confirm('⚠️ TRIGGER EMERGENCY SOS?\nThis will alert ALL zones and activate evacuation.')) {
                    SimEngine.triggerSOS();
                    UI.showToast('🚨 SOS EMERGENCY ACTIVATED!', 'error');

                    // Create SOS overlay
                    let overlay = document.querySelector('.sos-overlay');
                    if (!overlay) {
                        overlay = document.createElement('div');
                        overlay.className = 'sos-overlay';
                        document.body.appendChild(overlay);
                    }
                    setTimeout(() => overlay.remove(), 10000);
                }
            });
        }
    }

    function setupEvacuation() {
        const btn = document.getElementById('btn-evacuate');
        if (btn) {
            btn.addEventListener('click', () => {
                SimEngine.toggleEvacuation();
                updateEvacUI();
            });
        }
    }

    function updateEvacUI() {
        const snap = SimEngine.getSnapshot();
        const statusEl = document.getElementById('evac-status');
        const routesEl = document.getElementById('evac-routes');
        const btn = document.getElementById('btn-evacuate');

        if (snap.evacuation) {
            if (statusEl) statusEl.innerHTML = '<span class="status-dot red"></span> ⚠️ EVACUATION ACTIVE';
            if (routesEl) routesEl.classList.remove('hidden');
            if (btn) {
                btn.textContent = '';
                btn.innerHTML = '<i data-lucide="shield-check" class="btn-icon"></i> Deactivate Evacuation';
                btn.className = 'btn btn-outline btn-lg';
                lucide.createIcons({ nodes: [btn] });
            }
        } else {
            if (statusEl) statusEl.innerHTML = '<span class="status-dot green"></span> All systems normal';
            if (routesEl) routesEl.classList.add('hidden');
            if (btn) {
                btn.innerHTML = '<i data-lucide="alert-octagon" class="btn-icon"></i> Activate Evacuation Routes';
                btn.className = 'btn btn-danger btn-lg';
                lucide.createIcons({ nodes: [btn] });
            }
        }
    }

    function setupToggle() {
        document.querySelectorAll('.admin-toggle .toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.admin-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Just visual toggle for demo
                UI.showToast(`Switched to ${btn.dataset.view === 'organizer' ? 'Organizer' : 'Attendee'} view`, 'info');
            });
        });
    }

    function update(snapshot) {
        updateGateUI();
        updateEvacUI();
        updateIncidentLog(snapshot);
    }

    function updateIncidentLog(snapshot) {
        const log = document.getElementById('incident-log');
        if (!log) return;
        log.innerHTML = '';
        snapshot.incidents.slice(0, 15).forEach(inc => {
            const item = document.createElement('div');
            item.className = 'incident-item';
            item.innerHTML = `
                <span class="incident-severity ${inc.severity}"></span>
                <span class="incident-time">${inc.time}</span>
                <span class="incident-text">${inc.text}</span>
            `;
            log.appendChild(item);
        });
    }

    return { init, update };
})();
