/* ========================================
   StadiumPulse — Queue Tracker
   ======================================== */

const QueueTracker = (() => {

    function init() {
        renderQueueCards();
        setupFilters();
    }

    function renderQueueCards() {
        const grid = document.getElementById('queue-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const queueZones = ZONES.filter(z => ['gates', 'food', 'washroom', 'parking'].includes(z.type));
        queueZones.forEach(zone => {
            const card = createQueueCard(zone);
            grid.appendChild(card);
        });
    }

    function createQueueCard(zone) {
        const card = document.createElement('div');
        card.className = 'queue-card status-green';
        card.dataset.type = zone.type;
        card.dataset.zoneId = zone.id;

        const iconMap = {
            gates: 'door-open',
            food: 'utensils',
            washroom: 'shower-head',
            parking: 'car',
        };

        card.innerHTML = `
            <div class="queue-card-header">
                <div class="queue-card-title">
                    <div class="queue-type-icon">
                        <i data-lucide="${iconMap[zone.type] || 'circle'}"></i>
                    </div>
                    <span>${zone.name}</span>
                </div>
                <span class="queue-trend stable" data-trend="${zone.id}">—</span>
            </div>
            <div class="queue-wait wait-green" data-wait="${zone.id}">
                <span class="queue-wait-value" data-wait-val="${zone.id}">0</span>
                <span class="queue-wait-unit">min wait</span>
            </div>
            <div class="crowd-bar-container bar-green" data-bar="${zone.id}">
                <div class="crowd-bar-label">
                    <span>Crowd density</span>
                    <span data-bar-pct="${zone.id}">0%</span>
                </div>
                <div class="crowd-bar">
                    <div class="crowd-bar-fill" data-bar-fill="${zone.id}" style="width:0%"></div>
                </div>
            </div>
            <div class="queue-card-footer">
                <span class="queue-prediction" data-pred="${zone.id}">Calculating...</span>
                <button class="notify-btn" data-notify="${zone.id}">
                    <i data-lucide="bell"></i>
                    <span>Notify Me</span>
                </button>
            </div>
        `;

        // Notify button
        card.querySelector(`[data-notify="${zone.id}"]`).addEventListener('click', (e) => {
            e.stopPropagation();
            const subscribed = SimEngine.toggleNotifySubscription(zone.id);
            const btn = card.querySelector(`[data-notify="${zone.id}"]`);
            btn.classList.toggle('active', subscribed);
            btn.querySelector('span').textContent = subscribed ? 'Subscribed' : 'Notify Me';
            UI.showToast(subscribed ? `Notifications enabled for ${zone.name}` : `Notifications disabled for ${zone.name}`, subscribed ? 'success' : 'info');
        });

        return card;
    }

    function setupFilters() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                document.querySelectorAll('.queue-card').forEach(card => {
                    if (filter === 'all' || card.dataset.type === filter) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    function update(snapshot) {
        ZONES.filter(z => ['gates', 'food', 'washroom', 'parking'].includes(z.type)).forEach(zone => {
            const zData = snapshot.zones[zone.id];
            if (!zData) return;
            const density = SimEngine.getDensity(zone.id);
            const pct = Math.round(density * 100);
            const wait = zData.waitTime;

            // Card color
            const card = document.querySelector(`.queue-card[data-zone-id="${zone.id}"]`);
            if (card) {
                card.className = `queue-card status-${getStatusClass(wait)}`;
                card.dataset.type = zone.type;
                card.dataset.zoneId = zone.id;
            }

            // Wait value
            const waitVal = document.querySelector(`[data-wait-val="${zone.id}"]`);
            if (waitVal) waitVal.textContent = wait;

            // Wait color
            const waitWrap = document.querySelector(`[data-wait="${zone.id}"]`);
            if (waitWrap) waitWrap.className = `queue-wait wait-${getStatusClass(wait)}`;

            // Bar
            const barFill = document.querySelector(`[data-bar-fill="${zone.id}"]`);
            if (barFill) barFill.style.width = pct + '%';

            const barPct = document.querySelector(`[data-bar-pct="${zone.id}"]`);
            if (barPct) barPct.textContent = pct + '%';

            const barWrap = document.querySelector(`[data-bar="${zone.id}"]`);
            if (barWrap) barWrap.className = `crowd-bar-container bar-${getStatusClass(wait)}`;

            // Trend
            const trendEl = document.querySelector(`[data-trend="${zone.id}"]`);
            if (trendEl) {
                trendEl.textContent = zData.trend === 'up' ? '↑' : zData.trend === 'down' ? '↓' : '—';
                trendEl.className = `queue-trend ${zData.trend}`;
            }

            // Prediction text
            const predEl = document.querySelector(`[data-pred="${zone.id}"]`);
            if (predEl) {
                if (zData.trend === 'up' && density > 0.5) {
                    predEl.textContent = `Peak in ~${Math.floor(Math.random() * 12 + 3)} min`;
                } else if (zData.trend === 'down') {
                    predEl.textContent = 'Clearing up ✓';
                } else {
                    predEl.textContent = 'Stable';
                }
            }
        });

        // Prediction banner
        const predBanner = document.getElementById('prediction-text');
        if (predBanner) predBanner.textContent = SimEngine.getPrediction();
    }

    function getStatusClass(wait) {
        if (wait < 5) return 'green';
        if (wait <= 15) return 'yellow';
        return 'red';
    }

    return { init, update };
})();
