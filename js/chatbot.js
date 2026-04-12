/* ========================================
   StadiumPulse — Smart Chatbot
   ======================================== */

const Chatbot = (() => {
    const responses = {
        // Route & navigation
        'gate': 'For the fastest entry, I recommend Gate D — currently at only {gate_d_pct}% capacity. Gate A is at {gate_a_pct}%. Avoid Gate B if it\'s above 70%.',
        'route': 'Enter your seat details above and click "Find My Route" — I\'ll calculate the optimal path with real-time crowd data!',
        'block': 'Which block are you headed to? Use the seat finder above and I\'ll recommend the best gate and route.',
        'seat': 'To find your seat, enter your Block, Row, and Seat number in the fields above. I\'ll show you the fastest route!',
        'navigate': 'Use the seat finder panel above. Once you enter your block, I\'ll show step-by-step navigation with ETA.',

        // Food
        'food': 'Food Courts are located at all 4 corners. Currently, Food Court {best_food} has the shortest wait ({best_food_wait} min). You can pre-order from the Food tab!',
        'eat': 'Hungry? Food Court {best_food} is your best bet right now with a {best_food_wait} min wait. Check the Food Pre-Order in quick actions!',
        'drink': 'Head to Stall 4 (Beverages & Snacks) for drinks. Fresh Lime Soda is popular today! Pre-order to skip the queue.',
        'hungry': 'Food Court {best_food} has the shortest queue. Try the Vada Pav at Stall 3 — it\'s a crowd favorite! 🍽️',

        // Washroom
        'washroom': 'The nearest washroom with shortest wait: Washroom {best_wash} ({best_wash_wait} min wait). Follow the blue signs from your block.',
        'toilet': 'Washroom {best_wash} currently has the shortest queue at {best_wash_wait} minutes. Look for the blue washroom signs.',
        'bathroom': 'Head to Washroom {best_wash} — only {best_wash_wait} min wait. It\'s the fastest option right now.',

        // Medical
        'medical': 'Medical Bay is located near Block D/E junction. It\'s currently available with minimal wait. For emergencies, press the SOS button or call +91-2222-HELP.',
        'help': 'Need help? Medical services are near Block D. For emergencies, alert any staff member or use the SOS feature in the Admin tab.',
        'emergency': 'For medical emergencies, head to the Medical Bay near Block D. For general emergencies, contact staff or use the Admin Panel SOS.',
        'first aid': 'First aid station is at the Medical Bay near Block D/E. Currently minimal wait time.',

        // Parking
        'parking': 'Parking status: Lot A has {park_a} spots, Lot B has {park_b} spots, Lot D (VIP) has {park_d} spots available. Check Smart Parking in More features!',
        'car': 'See our Smart Parking feature in the More tab for real-time slot availability with bay numbers.',

        // Weather
        'weather': 'Today\'s forecast: 32°C, partly cloudy, humidity 65%. Wear light, breathable clothing. Don\'t forget sunscreen! ☀️',

        // General
        'hello': 'Hello! 👋 Welcome to Wankhede Stadium for the IPL Finals 2026! How can I help you today?',
        'hi': 'Hey there! 🏟️ Ready for the big match? Ask me about routes, food, facilities, or anything else!',
        'thank': 'You\'re welcome! Enjoy the match. Go team! 🏏🎉',
        'crowd': 'Current stadium occupancy is at {total_pct}%. Busiest zone: {busiest}. Use the Live Map tab for real-time density view.',
        'wait': 'Average wait time across all facilities: {avg_wait} min. Check the Queues tab for detailed breakdown by facility.',
        'time': 'The match is scheduled for 7:30 PM IST. Gates open 2 hours before. Current phase: {phase}.',
        'score': 'I\'m focused on stadium logistics! For live scores, check the official IPL app. But I can help you find the best screen view! 📺',
    };

    const defaultResponse = 'I can help with routes, food, washrooms, parking, crowds, and more! Try asking about any of these topics. 🏟️';

    function init() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('btn-chat-send');

        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleSend();
            });
        }
        if (sendBtn) {
            sendBtn.addEventListener('click', handleSend);
        }
    }

    function handleSend() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        input.value = '';

        // Simulate typing delay
        setTimeout(() => {
            const response = getResponse(text);
            addMessage(response, 'bot');
        }, 500 + Math.random() * 800);
    }

    function addMessage(text, sender) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const msg = document.createElement('div');
        msg.className = `chat-msg ${sender}`;

        if (sender === 'bot') {
            msg.innerHTML = `
                <div class="chat-avatar"><i data-lucide="bot"></i></div>
                <div class="chat-bubble">${text}</div>
            `;
        } else {
            msg.innerHTML = `<div class="chat-bubble">${text}</div>`;
        }

        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
        lucide.createIcons({ nodes: [msg] });
    }

    function getResponse(query) {
        const q = query.toLowerCase();
        const snap = SimEngine.getSnapshot();

        // Build dynamic values
        const gateADensity = Math.round(SimEngine.getDensity('gate-a') * 100);
        const gateDDensity = Math.round(SimEngine.getDensity('gate-d') * 100);

        // Find best food court
        const foodZones = ZONES.filter(z => z.type === 'food');
        let bestFood = foodZones[0];
        foodZones.forEach(f => {
            if ((snap.zones[f.id]?.waitTime || 99) < (snap.zones[bestFood.id]?.waitTime || 99)) {
                bestFood = f;
            }
        });

        // Find best washroom
        const washZones = ZONES.filter(z => z.type === 'washroom');
        let bestWash = washZones[0];
        washZones.forEach(w => {
            if ((snap.zones[w.id]?.waitTime || 99) < (snap.zones[bestWash.id]?.waitTime || 99)) {
                bestWash = w;
            }
        });

        const replacements = {
            '{gate_a_pct}': gateADensity,
            '{gate_d_pct}': gateDDensity,
            '{best_food}': bestFood.name.replace('Food Court ', ''),
            '{best_food_wait}': snap.zones[bestFood.id]?.waitTime || 0,
            '{best_wash}': bestWash.name.replace('Washroom ', ''),
            '{best_wash_wait}': snap.zones[bestWash.id]?.waitTime || 0,
            '{total_pct}': Math.round(SimEngine.getTotalAttendees() / STADIUM_CONFIG.capacity * 100),
            '{busiest}': SimEngine.getBusiestZone(),
            '{avg_wait}': SimEngine.getAvgWaitTime(),
            '{phase}': snap.phase,
            '{park_a}': PARKING_DATA[0].total - PARKING_DATA[0].occupied,
            '{park_b}': PARKING_DATA[1].total - PARKING_DATA[1].occupied,
            '{park_d}': PARKING_DATA[3].total - PARKING_DATA[3].occupied,
        };

        // Match keywords
        for (const [keyword, response] of Object.entries(responses)) {
            if (q.includes(keyword)) {
                let r = response;
                for (const [placeholder, value] of Object.entries(replacements)) {
                    r = r.replaceAll(placeholder, value);
                }
                return r;
            }
        }

        return defaultResponse;
    }

    return { init };
})();
