/* ========================================
   StadiumPulse — Analytics Dashboard
   ======================================== */

const Analytics = (() => {
    let crowdFlowChart = null;
    let zoneDistChart = null;
    let heatmapHistChart = null;
    let crowdFlowData = [];

    function init() {
        setupExport();
        setupReplay();
    }

    function initCharts() {
        createCrowdFlowChart();
        createZoneDistChart();
        createHeatmapHistoryChart();
    }

    function createCrowdFlowChart() {
        const ctx = document.getElementById('chart-crowd-flow');
        if (!ctx) return;

        crowdFlowChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Total Crowd',
                    data: [],
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0,212,255,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2,
                }],
            },
            options: getChartOptions('Crowd Over Time'),
        });
    }

    function createZoneDistChart() {
        const ctx = document.getElementById('chart-zone-dist');
        if (!ctx) return;

        zoneDistChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#00d4ff', '#00ff88', '#ffaa00', '#ff3b5c',
                        '#a855f7', '#06b6d4',
                    ],
                    borderColor: 'rgba(10,14,26,0.8)',
                    borderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#8b92a8', font: { size: 11 }, padding: 12 },
                    },
                },
                cutout: '65%',
            },
        });
    }

    function createHeatmapHistoryChart() {
        const ctx = document.getElementById('chart-heatmap-history');
        if (!ctx) return;

        const zones = ['Gate A', 'Gate B', 'Gate C', 'Gate D'];
        const colors = ['#00d4ff', '#00ff88', '#ffaa00', '#ff3b5c'];

        heatmapHistChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: zones.map((z, i) => ({
                    label: z,
                    data: [],
                    borderColor: colors[i],
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2,
                })),
            },
            options: getChartOptions('Heatmap History'),
        });
    }

    function getChartOptions(title) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 500 },
            scales: {
                x: {
                    ticks: { color: '#5a6178', maxTicksLimit: 12 },
                    grid: { color: 'rgba(255,255,255,0.03)' },
                },
                y: {
                    ticks: { color: '#5a6178' },
                    grid: { color: 'rgba(255,255,255,0.03)' },
                },
            },
            plugins: {
                legend: {
                    labels: { color: '#8b92a8', font: { size: 11 } },
                },
            },
        };
    }

    function update(snapshot) {
        updateKPIs(snapshot);
        updateCrowdFlowChart();
        updateZoneDistChart();
        updateHeatmapHistoryChart();
    }

    function updateKPIs(snapshot) {
        const totalEl = document.getElementById('kpi-attendance');
        if (totalEl) totalEl.textContent = SimEngine.getTotalAttendees().toLocaleString();

        const avgWait = document.getElementById('kpi-avg-wait');
        if (avgWait) avgWait.textContent = SimEngine.getAvgWaitTime() + ' min';

        const busiest = document.getElementById('kpi-busiest');
        if (busiest) busiest.textContent = SimEngine.getBusiestZone();

        const incidents = document.getElementById('kpi-incidents');
        if (incidents) incidents.textContent = snapshot.incidents.filter(i => i.severity === 'high').length;

        const gates = document.getElementById('kpi-gates');
        if (gates) gates.textContent = `${SimEngine.getActiveGateCount()}/4`;
    }

    function updateCrowdFlowChart() {
        if (!crowdFlowChart) return;
        const total = SimEngine.getTotalAttendees();
        crowdFlowData.push(total);
        if (crowdFlowData.length > 60) crowdFlowData.shift();

        crowdFlowChart.data.labels = crowdFlowData.map((_, i) => i + ' min');
        crowdFlowChart.data.datasets[0].data = crowdFlowData;
        crowdFlowChart.update('none');
    }

    function updateZoneDistChart() {
        if (!zoneDistChart) return;
        const seatZones = ZONES.filter(z => z.type === 'seating');
        zoneDistChart.data.labels = seatZones.map(z => z.name);
        zoneDistChart.data.datasets[0].data = seatZones.map(z => {
            const snap = SimEngine.getSnapshot();
            return snap.zones[z.id]?.crowd || 0;
        });
        zoneDistChart.update('none');
    }

    function updateHeatmapHistoryChart() {
        if (!heatmapHistChart) return;
        const history = SimEngine.getHistory();
        const last30 = history.slice(-36);
        const gateIds = ['gate-a', 'gate-b', 'gate-c', 'gate-d'];

        heatmapHistChart.data.labels = last30.map(h => h.minute + 'm');
        gateIds.forEach((gId, i) => {
            heatmapHistChart.data.datasets[i].data = last30.map(h => Math.round((h.data[gId] || 0) * 100));
        });
        heatmapHistChart.update('none');
    }

    function setupExport() {
        document.getElementById('btn-export')?.addEventListener('click', () => {
            UI.showToast('📊 Report exported successfully!', 'success');
        });
    }

    function setupReplay() {
        document.getElementById('btn-replay')?.addEventListener('click', () => {
            UI.showToast('▶️ Replaying last 30 minutes of heatmap data...', 'info');
        });
    }

    return { init, initCharts, update };
})();
