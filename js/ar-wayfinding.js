/* ========================================
   StadiumPulse — AR Wayfinding Engine
   ======================================== */

const ARWayfinding = (() => {
    let video, canvas, ctx;
    let stream = null;
    let isActive = false;
    let isNavigating = false;
    let currentDest = null;
    let markers = [];
    let animationId = null;

    const DESTINATIONS = {
        seat: { name: 'Seat A12', sub: 'North Stand, Row 12', icon: 'armchair', color: '#00ff88' },
        exit: { name: 'Gate C Exit', sub: 'Nearest exit (2 min)', icon: 'log-out', color: '#ff3b5c' },
        food: { name: 'Food Court 3', sub: 'Burgers & Beverages', icon: 'utensils', color: '#00d4ff' },
        restroom: { name: 'Restroom North', sub: 'Next to Gate B', icon: 'bath', color: '#ffaa00' }
    };

    function init() {
        video = document.getElementById('ar-video');
        canvas = document.getElementById('ar-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        setupEventListeners();
    }

    function setupEventListeners() {
        document.querySelectorAll('.dest-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const destId = btn.dataset.dest;
                startNavigation(destId);
            });
        });

        document.getElementById('btn-stop-nav')?.addEventListener('click', stopNavigation);
        document.getElementById('btn-request-ar')?.addEventListener('click', start);
    }

    async function start() {
        if (isActive) return;

        const container = document.getElementById('ar-container');
        const fallback = document.getElementById('ar-fallback');
        const scanning = document.getElementById('ar-scanning');
        const controls = document.getElementById('ar-controls');

        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' },
                audio: false 
            });
            
            video.srcObject = stream;
            isActive = true;
            
            container.classList.remove('hidden');
            fallback.classList.add('hidden');
            scanning.classList.remove('hidden');
            controls.classList.add('hidden');

            resize();
            window.addEventListener('resize', resize);
            
            // Simulate scanning
            setTimeout(() => {
                scanning.classList.add('hidden');
                controls.classList.remove('hidden');
                generateMarkers();
                animate();
            }, 2500);

        } catch (err) {
            console.error('AR Camera Error:', err);
            container.classList.add('hidden');
            fallback.classList.remove('hidden');
            UI.showToast('Camera access denied or not available', 'error');
        }
    }

    function stop() {
        isActive = false;
        isNavigating = false;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (animationId) cancelAnimationFrame(animationId);
        window.removeEventListener('resize', resize);
        
        document.getElementById('ar-guidance')?.classList.add('hidden');
        document.getElementById('ar-controls')?.classList.add('hidden');
        document.getElementById('ar-scanning')?.classList.add('hidden');
    }

    function resize() {
        if (!canvas || !video) return;
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
    }

    function generateMarkers() {
        markers = [];
        const types = ['seat', 'exit', 'food', 'restroom'];
        for (let i = 0; i < 8; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            markers.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random() * 500 + 100,
                type: type,
                label: DESTINATIONS[type].name,
                pulse: 0
            });
        }
    }

    function startNavigation(destId) {
        currentDest = DESTINATIONS[destId];
        isNavigating = true;
        
        document.getElementById('ar-controls').classList.add('hidden');
        const guidance = document.getElementById('ar-guidance');
        guidance.classList.remove('hidden');
        
        document.getElementById('guidance-main').textContent = `Navigate to ${currentDest.name}`;
        document.getElementById('guidance-sub').textContent = `Follow the ${destId === 'exit' ? 'red' : 'green'} arrows`;
        
        UI.showToast(`Navigation started to ${currentDest.name}`, 'success');
    }

    function stopNavigation() {
        isNavigating = false;
        document.getElementById('ar-guidance').classList.add('hidden');
        document.getElementById('ar-controls').classList.remove('hidden');
    }

    function animate() {
        if (!isActive) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const time = Date.now() * 0.002;

        markers.forEach(m => {
            // Simulated movement
            m.x += Math.sin(time + m.z) * 0.5;
            m.y += Math.cos(time + m.z * 0.5) * 0.5;
            
            const scale = 200 / m.z;
            const opacity = Math.min(1, scale * 2);
            
            if (opacity > 0.1) {
                drawMarker(m.x, m.y, m.type, m.label, scale, opacity);
            }
        });

        if (isNavigating) {
            drawPath();
        }

        animationId = requestAnimationFrame(animate);
    }

    function drawMarker(x, y, type, label, scale, opacity) {
        const color = DESTINATIONS[type].color;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = opacity;

        // Pulse effect
        const pulse = (Math.sin(Date.now() * 0.005) + 1) * 5;
        
        // Marker Ring
        ctx.beginPath();
        ctx.arc(0, 0, 20 + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon Circle
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText(label, 0, 35);
        
        ctx.restore();
    }

    function drawPath() {
        const color = currentDest.color;
        const time = Date.now() * 0.005;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 10]);
        ctx.lineDashOffset = -time * 10;
        
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height);
        ctx.bezierCurveTo(
            canvas.width / 2, canvas.height * 0.6,
            canvas.width * 0.8, canvas.height * 0.4,
            canvas.width * 0.7, canvas.height * 0.2
        );
        ctx.stroke();

        // Arrows along the path
        for (let i = 0.2; i < 1; i += 0.2) {
            const t = (i + (time * 0.02) % 0.2);
            const ax = canvas.width / 2 * (1 - t) * (1 - t) + 2 * canvas.width * 0.8 * (1 - t) * t + canvas.width * 0.7 * t * t;
            const ay = canvas.height * (1 - t) * (1 - t) + 2 * canvas.height * 0.4 * (1 - t) * t + canvas.height * 0.2 * t * t;
            
            drawArrow(ax, ay, color);
        }
        
        ctx.restore();
    }

    function drawArrow(x, y, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, 10);
        ctx.lineTo(0, 7);
        ctx.lineTo(10, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    return { init, start, stop };
})();
