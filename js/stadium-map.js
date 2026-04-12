/* ========================================
   StadiumPulse — Stadium SVG Map
   ======================================== */

const StadiumMap = (() => {
    let svg = null;
    let tooltip = null;

    function init() {
        svg = document.getElementById('stadium-svg');
        if (!svg) return;
        createTooltip();
        drawStadium();
    }

    function createTooltip() {
        tooltip = document.createElement('div');
        tooltip.className = 'zone-tooltip';
        document.getElementById('stadium-map-wrapper').appendChild(tooltip);
    }

    function drawStadium() {
        svg.innerHTML = '';

        // Outer stadium ring
        const outerRing = createSVGEl('ellipse', {
            cx: 400, cy: 300, rx: 370, ry: 270,
            fill: 'none', stroke: 'rgba(0,212,255,0.15)', 'stroke-width': 2,
        });
        svg.appendChild(outerRing);

        // Inner field
        const field = createSVGEl('ellipse', {
            cx: 400, cy: 300, rx: 140, ry: 100,
            fill: 'rgba(0,255,136,0.06)', stroke: 'rgba(0,255,136,0.2)', 'stroke-width': 1,
        });
        svg.appendChild(field);

        // Field label
        const fieldLabel = createSVGEl('text', {
            x: 400, y: 305, fill: 'rgba(0,255,136,0.4)',
            'font-size': '14', 'text-anchor': 'middle', 'font-family': 'Orbitron',
        });
        fieldLabel.textContent = '⬤ PITCH';
        svg.appendChild(fieldLabel);

        // Pitch crease lines
        const crease1 = createSVGEl('line', {
            x1: 360, y1: 300, x2: 440, y2: 300,
            stroke: 'rgba(0,255,136,0.15)', 'stroke-width': 1,
        });
        svg.appendChild(crease1);

        // Draw zones
        ZONES.forEach(zone => {
            drawZone(zone);
        });
    }

    function drawZone(zone) {
        const g = createSVGEl('g', { class: 'zone-group', 'data-zone-id': zone.id });

        let shape;
        if (zone.type === 'seating') {
            // Seating blocks as arcs/wedges
            shape = createSVGEl('rect', {
                x: zone.x - 50, y: zone.y - 25, width: 100, height: 50,
                rx: 8, ry: 8,
                class: 'zone-shape',
                fill: getZoneColor(0.3),
            });
        } else if (zone.type === 'gates') {
            shape = createSVGEl('rect', {
                x: zone.x - 30, y: zone.y - 18, width: 60, height: 36,
                rx: 6, ry: 6,
                class: 'zone-shape',
                fill: getZoneColor(0.2),
            });
        } else {
            shape = createSVGEl('rect', {
                x: zone.x - 25, y: zone.y - 15, width: 50, height: 30,
                rx: 5, ry: 5,
                class: 'zone-shape',
                fill: getZoneColor(0.3),
            });
        }
        shape.setAttribute('data-zone-id', zone.id);
        g.appendChild(shape);

        // Zone label
        const label = createSVGEl('text', {
            x: zone.x, y: zone.y - 2,
            class: 'zone-label',
        });
        label.textContent = zone.name;
        g.appendChild(label);

        // Capacity text
        const cap = createSVGEl('text', {
            x: zone.x, y: zone.y + 12,
            class: 'zone-capacity',
        });
        cap.textContent = '0%';
        cap.setAttribute('data-cap-id', zone.id);
        g.appendChild(cap);

        // Crowd dots
        for (let i = 0; i < 3; i++) {
            const dot = createSVGEl('circle', {
                cx: zone.x - 10 + i * 10, cy: zone.y + 22,
                r: 2,
                class: 'crowd-dot',
                style: `animation-delay: ${i * 0.3}s`,
            });
            dot.setAttribute('data-dot-zone', zone.id);
            g.appendChild(dot);
        }

        // Event listeners
        g.addEventListener('mouseenter', (e) => showTooltip(zone, e));
        g.addEventListener('mouseleave', hideTooltip);
        g.addEventListener('click', () => onZoneClick(zone));

        svg.appendChild(g);
    }

    function update(snapshot) {
        ZONES.forEach(zone => {
            const density = SimEngine.getDensity(zone.id);
            const color = getZoneColor(density);
            const shapes = svg.querySelectorAll(`[data-zone-id="${zone.id}"].zone-shape`);
            shapes.forEach(s => {
                s.setAttribute('fill', color);
            });

            // Update capacity text
            const capText = svg.querySelector(`[data-cap-id="${zone.id}"]`);
            if (capText) {
                capText.textContent = Math.round(density * 100) + '%';
            }

            // Update dot visibility
            const dots = svg.querySelectorAll(`[data-dot-zone="${zone.id}"]`);
            dots.forEach((dot, i) => {
                dot.style.display = density > (i * 0.3) ? 'block' : 'none';
            });
        });
    }

    function showTooltip(zone, e) {
        const snap = SimEngine.getSnapshot();
        const zData = snap.zones[zone.id];
        const density = SimEngine.getDensity(zone.id);
        const statusText = density < 0.4 ? 'Clear' : density < 0.7 ? 'Moderate' : 'Crowded';
        const statusColor = density < 0.4 ? '#00ff88' : density < 0.7 ? '#ffaa00' : '#ff3b5c';

        tooltip.innerHTML = `
            <h4>${zone.name}</h4>
            <div class="zone-tooltip-row"><span>Status</span><span style="color:${statusColor}">${statusText}</span></div>
            <div class="zone-tooltip-row"><span>Crowd</span><span>${zData?.crowd || 0} / ${zone.capacity}</span></div>
            <div class="zone-tooltip-row"><span>Density</span><span>${Math.round(density * 100)}%</span></div>
            <div class="zone-tooltip-row"><span>Wait Time</span><span>${zData?.waitTime || 0} min</span></div>
            <div class="zone-tooltip-row"><span>Type</span><span>${zone.type}</span></div>
        `;

        const wrapper = document.getElementById('stadium-map-wrapper');
        const rect = wrapper.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();

        // Position tooltip near cursor
        const x = e.clientX - rect.left + 15;
        const y = e.clientY - rect.top - 10;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
        tooltip.classList.add('visible');
    }

    function hideTooltip() {
        tooltip.classList.remove('visible');
    }

    function onZoneClick(zone) {
        const density = SimEngine.getDensity(zone.id);
        const snap = SimEngine.getSnapshot();
        const zData = snap.zones[zone.id];
        UI.showToast(`${zone.name}: ${zData?.crowd}/${zone.capacity} (${Math.round(density * 100)}%) — Wait: ${zData?.waitTime} min`, 'info');
    }

    function getZoneColor(density) {
        if (density < 0.4) return 'rgba(0, 255, 136, 0.2)';
        if (density < 0.7) return 'rgba(255, 170, 0, 0.25)';
        return 'rgba(255, 59, 92, 0.3)';
    }

    function createSVGEl(tag, attrs) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [key, val] of Object.entries(attrs)) {
            el.setAttribute(key, val);
        }
        return el;
    }

    return { init, update };
})();
