/* ========================================
   StadiumPulse — Live Data Integration
   GPS Auto-Detection, WebSocket Live Updates
   ======================================== */

const LiveData = (() => {
    'use strict';

    const API_BASE = window.location.port === '5500' || window.location.port === '5501'
        ? 'http://localhost:5000/api'
        : '/api';
    let ws = null;

    function init() {
        detectStadiumByGPS();
        fetchLiveWeather();
        connectWebSocket();
    }

    // ---- FEATURE 1: LIVE WEATHER ----
    async function fetchLiveWeather() {
        try {
            const json = await authFetch(`${API_BASE}/weather?city=Mumbai`);
            if (!json || !json.success || !json.data) return;
            const w = json.data;
            updateWeatherWidget(w);
        } catch (err) {
            console.log('[LiveData] Weather fetch failed, using defaults:', err.message);
        }
    }

    function updateWeatherWidget(w) {
        const widget = document.getElementById('weather-widget');
        if (!widget) return;

        const tempEl = widget.querySelector('.weather-temp');
        if (tempEl) tempEl.textContent = `${w.temp}°C`;

        const details = widget.querySelectorAll('.weather-details span');
        if (details.length >= 3) {
            details[0].innerHTML = `<i data-lucide="droplets"></i> Humidity: ${w.humidity}%`;
            details[1].innerHTML = `<i data-lucide="wind"></i> Wind: ${w.windKmh} km/h`;
            details[2].innerHTML = `<i data-lucide="thermometer"></i> Feels: ${w.feelsLike}°C`;
        }

        // Re-render lucide icons inside the widget
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [widget] });
        }
    }

    // ---- FEATURE 2: GPS STADIUM AUTO-DETECTION ----
    function detectStadiumByGPS() {
        if (!('geolocation' in navigator)) {
            console.log('[LiveData] Geolocation not available');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const json = await authFetch(`${API_BASE}/stadiums/detect`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude
                        })
                    });
                    if (!json || !json.success || !json.data) return;
                    const { stadium } = json.data;

                    if (stadium) {
                        // Update the event title in navbar
                        const eventSpan = document.querySelector('.event-title span');
                        if (eventSpan) {
                            eventSpan.textContent = stadium.activeEvent?.name || stadium.name;
                        }

                        // Store for subsequent API calls
                        localStorage.setItem('detectedStadium', JSON.stringify(stadium));
                        localStorage.setItem('stadiumId', stadium.id);

                        // Show toast
                        if (typeof UI !== 'undefined') {
                            UI.showToast(`${stadium.name} detected automatically ✓`, 'success');
                        }
                    }
                } catch (err) {
                    console.log('[LiveData] Stadium detection failed:', err.message);
                }
            },
            (err) => {
                console.log('[LiveData] GPS unavailable — using default stadium');
            },
            { timeout: 8000, maximumAge: 300000 }
        );
    }

    // ---- FEATURE 3 & 4: WEBSOCKET LIVE UPDATES ----
    function connectWebSocket() {
        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = (window.location.port === '5500' || window.location.port === '5501')
                ? 'localhost:5000'
                : window.location.host;
            const wsUrl = `${wsProtocol}//${wsHost}?token=` + getToken();
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('[LiveData] WebSocket connected');
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    handleWSMessage(msg);
                } catch (e) {
                    // ignore malformed messages
                }
            };

            ws.onerror = () => {
                console.log('[LiveData] WebSocket error — backend may not be running');
            };

            ws.onclose = () => {
                console.log('[LiveData] WebSocket closed, reconnecting in 5s...');
                setTimeout(connectWebSocket, 5000);
            };
        } catch (err) {
            console.log('[LiveData] WebSocket init failed:', err.message);
        }
    }

    function handleWSMessage(msg) {
        const { type, payload } = msg;

        switch (type) {
            case 'WEATHER_UPDATE':
                updateWeatherWidget(payload);
                break;

            case 'MATCH_UPDATE':
                // Update navbar event title with live score
                if (payload.score && payload.score[0]) {
                    const s = payload.score[0];
                    const eventSpan = document.querySelector('.event-title span');
                    if (eventSpan) {
                        eventSpan.textContent =
                            `MI vs CSK  |  ${s.r}/${s.w} (${s.o} Ov)`;
                    }
                }
                break;

            case 'QUEUE_POSITION':
                // Update queue wait display if card exists
                if (payload.facilityId) {
                    const card = document.getElementById(`queue-${payload.facilityId}`);
                    if (card) {
                        const waitEl = card.querySelector('.queue-wait');
                        if (waitEl) waitEl.textContent = payload.estimatedWait + 'm';
                    }
                }
                break;

            case 'QUEUE_CALLED':
                // Show toast that user's turn is ready
                if (typeof UI !== 'undefined') {
                    UI.showToast('Your turn at the facility! Please proceed. ✓', 'success');
                }
                break;

            default:
                // Other message types handled elsewhere
                break;
        }
    }

    return { init };
})();
