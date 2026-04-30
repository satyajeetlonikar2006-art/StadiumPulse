/* ========================================
   StadiumPulse — Simulation Engine
   ======================================== */

const SimEngine = (() => {
    let state = {};
    let eventPhase = 'pre-event'; // pre-event, entry, first-half, halftime, second-half, exit
    let phaseMinute = 0;
    let fastForward = false;
    let intervalId = null;
    let listeners = [];
    let incidents = [];
    let gateStatus = { 'gate-a': true, 'gate-b': true, 'gate-c': true, 'gate-d': true };
    let evacuationActive = false;
    let sosActive = false;
    let notifications = [];
    let notifySubscriptions = new Set();
    let historyLog = []; // For heatmap replay

    function init() {
        // Initialize crowd counts for each zone
        ZONES.forEach(zone => {
            state[zone.id] = {
                crowd: Math.floor(zone.capacity * (0.1 + Math.random() * 0.2)),
                waitTime: Math.floor(Math.random() * 5),
                trend: 'stable',
                prevCrowd: 0,
            };
        });
        phaseMinute = 0;
        eventPhase = 'entry';
        logIncident('System initialized — simulation started', 'low');
    }

    function subscribe(fn) {
        listeners.push(fn);
    }

    function notify() {
        const snapshot = getSnapshot();
        listeners.forEach(fn => fn(snapshot));
    }

    function getSnapshot() {
        return {
            zones: JSON.parse(JSON.stringify(state)),
            phase: eventPhase,
            minute: phaseMinute,
            gates: { ...gateStatus },
            evacuation: evacuationActive,
            sos: sosActive,
            incidents: [...incidents],
            notifications: [...notifications],
        };
    }

    function tick() {
        phaseMinute += fastForward ? 5 : 1;
        updatePhase();
        ZONES.forEach(zone => {
            updateZone(zone);
        });
        checkAlerts();
        // Record history
        const hist = {};
        ZONES.forEach(z => { hist[z.id] = getDensity(z.id); });
        historyLog.push({ 
            minute: phaseMinute, 
            data: hist,
            total: getTotalAttendees()
        });
        if (historyLog.length > 360) historyLog.shift(); // Keep ~60 min
        notify();
    }

    function updatePhase() {
        if (phaseMinute < 30) eventPhase = 'entry';
        else if (phaseMinute < 75) eventPhase = 'first-half';
        else if (phaseMinute < 95) eventPhase = 'halftime';
        else if (phaseMinute < 140) eventPhase = 'second-half';
        else eventPhase = 'exit';
    }

    function updateZone(zone) {
        const s = state[zone.id];
        s.prevCrowd = s.crowd;
        let multiplier = getPhaseMultiplier(zone);
        let delta = Math.floor((Math.random() - 0.45) * zone.capacity * 0.06 * multiplier);

        // Gate closed → reduce inflow
        if (zone.type === 'gates' && !gateStatus[zone.id]) {
            delta = -Math.abs(delta);
        }

        // Evacuation → everyone leaves
        if (evacuationActive) {
            delta = -Math.floor(zone.capacity * 0.1);
        }

        s.crowd = Math.max(0, Math.min(zone.capacity, s.crowd + delta));
        s.waitTime = Math.max(0, Math.round((s.crowd / zone.capacity) * 25 + (Math.random() - 0.5) * 4));
        s.trend = s.crowd > s.prevCrowd ? 'up' : s.crowd < s.prevCrowd ? 'down' : 'stable';
    }

    function getPhaseMultiplier(zone) {
        switch (eventPhase) {
            case 'entry':
                return zone.type === 'gates' ? 2.5 : zone.type === 'seating' ? 1.8 : 0.8;
            case 'first-half':
                return zone.type === 'seating' ? 0.3 : zone.type === 'food' ? 0.5 : 0.4;
            case 'halftime':
                return zone.type === 'food' ? 3.0 : zone.type === 'washroom' ? 2.5 : 0.8;
            case 'second-half':
                return zone.type === 'seating' ? 0.3 : 0.5;
            case 'exit':
                return zone.type === 'gates' ? 2.0 : zone.type === 'parking' ? 2.5 : 1.0;
            default:
                return 1.0;
        }
    }

    function checkAlerts() {
        ZONES.forEach(zone => {
            const density = getDensity(zone.id);
            if (density > 0.8) {
                const msg = `⚠️ ${zone.name} is at ${Math.round(density * 100)}% capacity!`;
                addNotification(msg, 'warning');
                if (density > 0.9) {
                    logIncident(`${zone.name} overcrowded — ${Math.round(density * 100)}%`, 'high');
                }
            }
        });
    }

    function getDensity(zoneId) {
        const zone = ZONES.find(z => z.id === zoneId);
        if (!zone) return 0;
        return state[zoneId] ? state[zoneId].crowd / zone.capacity : 0;
    }

    function getTotalAttendees() {
        return ZONES.filter(z => z.type === 'seating')
            .reduce((sum, z) => sum + (state[z.id]?.crowd || 0), 0);
    }

    function toggleGate(gateId) {
        gateStatus[gateId] = !gateStatus[gateId];
        const status = gateStatus[gateId] ? 'OPENED' : 'CLOSED';
        logIncident(`${gateId} ${status} by admin`, 'medium');
        addNotification(`🚪 ${ZONES.find(z => z.id === gateId)?.name || gateId} has been ${status}`, 'info');
        notify();
    }

    function toggleEvacuation() {
        evacuationActive = !evacuationActive;
        if (evacuationActive) {
            logIncident('⚠️ EVACUATION ACTIVATED', 'high');
            addNotification('🚨 EVACUATION IN PROGRESS — Follow exit signs!', 'error');
        } else {
            logIncident('Evacuation deactivated', 'medium');
            addNotification('✅ Evacuation lifted — All clear', 'success');
        }
        notify();
    }

    function triggerSOS() {
        sosActive = true;
        logIncident('🚨 SOS EMERGENCY TRIGGERED', 'high');
        addNotification('🚨 EMERGENCY ALERT — Follow staff instructions immediately!', 'error');
        // Auto-activate evacuation
        if (!evacuationActive) toggleEvacuation();
        notify();
        setTimeout(() => {
            sosActive = false;
            notify();
        }, 10000);
    }

    function broadcastAlert(zone, message) {
        const zoneName = zone === 'all' ? 'All Zones' : (ZONES.find(z => z.id === zone)?.name || zone);
        logIncident(`Broadcast to ${zoneName}: "${message}"`, 'medium');
        addNotification(`📢 [${zoneName}] ${message}`, 'info');
        notify();
    }

    function logIncident(text, severity) {
        incidents.unshift({
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            text,
            severity,
        });
        if (incidents.length > 50) incidents.pop();
    }

    function addNotification(text, type) {
        notifications.unshift({
            id: Date.now() + Math.random(),
            text,
            type,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });
        if (notifications.length > 30) notifications.pop();
    }

    function clearNotifications() {
        notifications = [];
        notify();
    }

    function toggleNotifySubscription(facilityId) {
        if (notifySubscriptions.has(facilityId)) {
            notifySubscriptions.delete(facilityId);
            return false;
        } else {
            notifySubscriptions.add(facilityId);
            return true;
        }
    }

    function isNotifySubscribed(facilityId) {
        return notifySubscriptions.has(facilityId);
    }

    function setFastForward(val) {
        fastForward = val;
    }

    function start() {
        if (intervalId) return;
        init();
        intervalId = setInterval(tick, fastForward ? 500 : 5000);
        notify();
    }

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function restart() {
        stop();
        start();
    }

    function getHistory() {
        return historyLog;
    }

    function getPrediction() {
        const predictions = [];
        ZONES.filter(z => z.type === 'gates' || z.type === 'food').forEach(zone => {
            const d = getDensity(zone.id);
            const trend = state[zone.id]?.trend;
            if (trend === 'up' && d > 0.5) {
                const minsToFull = Math.round(((1 - d) / 0.06) * 5);
                predictions.push(`Peak crowd expected at ${zone.name} in ~${minsToFull} minutes`);
            }
        });
        if (eventPhase === 'first-half' && phaseMinute > 60) {
            predictions.push('Halftime rush expected in ~' + (75 - phaseMinute) + ' min — pre-order food now!');
        }
        return predictions.length > 0 ? predictions[Math.floor(Math.random() * predictions.length)] :
            eventPhase === 'halftime' ? '🍕 Halftime rush active — Food Courts 1 & 3 filling fast!' :
            eventPhase === 'exit' ? '🚗 Exit surge in progress — Use Gate D for fastest exit' :
            '📊 Analyzing crowd patterns — All zones within normal range';
    }

    function getBusiestZone() {
        let busiest = null;
        let maxDensity = 0;
        ZONES.forEach(z => {
            const d = getDensity(z.id);
            if (d > maxDensity) {
                maxDensity = d;
                busiest = z.name;
            }
        });
        return busiest || '--';
    }

    function getAvgWaitTime() {
        const queueZones = ZONES.filter(z => ['gates', 'food', 'washroom'].includes(z.type));
        const total = queueZones.reduce((s, z) => s + (state[z.id]?.waitTime || 0), 0);
        return Math.round(total / queueZones.length);
    }

    function getActiveGateCount() {
        return Object.values(gateStatus).filter(v => v).length;
    }

    return {
        start, stop, restart, subscribe, getSnapshot, getDensity, getTotalAttendees,
        toggleGate, toggleEvacuation, triggerSOS, broadcastAlert, setFastForward,
        toggleNotifySubscription, isNotifySubscribed, clearNotifications,
        getHistory, getPrediction, getBusiestZone, getAvgWaitTime, getActiveGateCount,
    };
})();
