/* ========================================
   StadiumPulse — UI Controller
   ======================================== */

const UI = (() => {
    let currentTab = 'heatmap';

    function init() {
        setupTabs();
        setupDatetime();
        setupAlerts();
        setupSeatFinder();
        setupQuickActions();
    }

    // ---- TABS ----
    function setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                switchTab(tab);
            });
        });
    }

    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
    }

    // ---- DATETIME ----
    function setupDatetime() {
        updateDatetime();
        setInterval(updateDatetime, 1000);
    }

    function updateDatetime() {
        const now = new Date();
        const timeEl = document.getElementById('nav-time');
        const dateEl = document.getElementById('nav-date');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // ---- ALERTS ----
    function setupAlerts() {
        // Initial alert
        addAlert('Welcome to Wankhede Stadium! Follow live crowd updates below.');
    }

    function addAlert(text) {
        const scroll = document.getElementById('alert-scroll');
        if (!scroll) return;
        const item = document.createElement('div');
        item.className = 'alert-item';
        item.innerHTML = `<span class="alert-dot"></span><span>${text}</span>`;
        scroll.prepend(item);
        // Keep max 5
        while (scroll.children.length > 5) {
            scroll.removeChild(scroll.lastChild);
        }
    }

    // ---- SEAT FINDER ----
    function setupSeatFinder() {
        const btn = document.getElementById('btn-find-seat');
        if (btn) btn.addEventListener('click', findSeat);
    }

    function findSeat() {
        const block = document.getElementById('seat-block').value;
        const row = document.getElementById('seat-row').value;
        const seat = document.getElementById('seat-number').value;

        if (!block) {
            showToast('Please select a block', 'warning');
            return;
        }

        const route = BLOCK_GATE_MAP[block];
        if (!route) {
            showToast('Invalid block selection', 'error');
            return;
        }

        const resultDiv = document.getElementById('route-result');
        const detailsDiv = document.getElementById('route-details');
        resultDiv.classList.remove('hidden');

        const seatLabel = `Block ${block}${row ? `, Row ${row}` : ''}${seat ? `, Seat ${seat}` : ''}`;

        let html = `<div class="route-step">
            <span class="route-step-num">📍</span>
            <div class="route-info">
                <span>Destination: <strong>${seatLabel}</strong></span>
                <span class="route-eta">Best Gate: ${route.gate} | ETA: ${4 + Math.floor(Math.random() * 6)} minutes</span>
            </div>
        </div>`;

        route.path.forEach((step, i) => {
            html += `<div class="route-step">
                <span class="route-step-num">${i + 1}</span>
                <div class="route-info">
                    <span>${step}</span>
                    <span class="route-eta">~${1 + Math.floor(Math.random() * 3)} min</span>
                </div>
            </div>`;
        });

        detailsDiv.innerHTML = html;
        showToast(`Route calculated for ${seatLabel}`, 'success');
        addAlert(`Route ready: Use ${route.gate} → ${seatLabel}`);
    }

    // ---- QUICK ACTIONS ----
    function setupQuickActions() {
        document.getElementById('btn-nearby')?.addEventListener('click', () => {
            const blockEl = document.getElementById('seat-block');
            const block = blockEl ? blockEl.value : 'A';
            Modals.showNearby(block || 'A');
        });
        document.getElementById('btn-food-order')?.addEventListener('click', () => Modals.open('modal-food'));
        document.getElementById('btn-share-location')?.addEventListener('click', () => Modals.open('modal-share'));
        document.getElementById('btn-lost-found')?.addEventListener('click', () => Modals.open('modal-lost'));
        document.getElementById('btn-ar-nav')?.addEventListener('click', () => Modals.open('modal-ar'));
        document.getElementById('btn-upgrade-seat')?.addEventListener('click', () => Modals.open('modal-upgrade'));
    }

    // ---- TOAST ----
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const iconMap = {
            success: 'check-circle',
            warning: 'alert-triangle',
            error: 'alert-octagon',
            info: 'info',
        };
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i data-lucide="${iconMap[type] || 'info'}" class="toast-icon"></i>
            <span>${message}</span>
            <i data-lucide="x" class="toast-close"></i>
        `;

        container.appendChild(toast);
        lucide.createIcons({ nodes: [toast] });

        toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
        setTimeout(() => removeToast(toast), 4500);
    }

    function removeToast(toast) {
        if (!toast.parentElement) return;
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }

    // ---- UPDATE FROM SIMULATION ----
    function onSimUpdate(snapshot) {
        // Total attendees
        const totalEl = document.getElementById('total-attendees');
        if (totalEl) totalEl.textContent = SimEngine.getTotalAttendees().toLocaleString();

        // Last update time
        const updateEl = document.getElementById('last-update-time');
        if (updateEl) updateEl.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Update map
        StadiumMap.update(snapshot);

        // Update alerts based on zones
        const congested = ZONES.filter(z => SimEngine.getDensity(z.id) > 0.8);
        if (congested.length > 0) {
            const z = congested[Math.floor(Math.random() * congested.length)];
            const alternatives = ZONES.filter(alt => alt.type === z.type && SimEngine.getDensity(alt.id) < 0.5);
            if (alternatives.length > 0) {
                const alt = alternatives[0];
                addAlert(`${z.name} congested — use ${alt.name} instead ✅`);
            }
        }

        // Notification badge
        const badge = document.getElementById('notif-badge');
        if (badge) {
            badge.textContent = snapshot.notifications.length;
            badge.style.display = snapshot.notifications.length > 0 ? 'flex' : 'none';
        }
    }

    return { init, switchTab, showToast, addAlert, onSimUpdate };
})();
