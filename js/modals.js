/* ========================================
   StadiumPulse — Modals Controller
   ======================================== */

const Modals = (() => {
    let foodCart = [];

    function init() {
        setupCloseButtons();
        setupFoodModal();
        setupLostFound();
        setupShareLocation();
        setupFeedback();
        setupParking();
        setupLeaderboard();
        setupUpgrades();
        setupNotifications();
        setupMoreCards();
    }

    function open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            lucide.createIcons({ nodes: [modal] });
        }
    }

    function close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    }

    function setupCloseButtons() {
        // Close buttons
        document.querySelectorAll('.modal-close, [data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.close || btn.closest('.modal-overlay')?.id;
                if (modalId) close(modalId);
            });
        });

        // Click overlay to close
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(overlay.id);
            });
        });
    }

    // ---- FOOD MODAL ----
    function setupFoodModal() {
        const stallSelect = document.getElementById('food-stall');
        if (stallSelect) {
            stallSelect.addEventListener('change', () => renderFoodMenu(stallSelect.value));
            renderFoodMenu('1');
        }

        document.getElementById('btn-place-order')?.addEventListener('click', () => {
            if (foodCart.length === 0) {
                UI.showToast('Your cart is empty!', 'warning');
                return;
            }
            const total = foodCart.reduce((s, item) => s + item.price, 0);
            UI.showToast(`🎉 Order placed! Total: ₹${total}. Pick up at counter.`, 'success');
            foodCart = [];
            updateCartUI();
            close('modal-food');
        });
    }

    function renderFoodMenu(stallId) {
        const menu = FOOD_MENUS[stallId] || [];
        const container = document.getElementById('food-menu');
        if (!container) return;

        container.innerHTML = menu.map((item, i) => `
            <div class="food-item">
                <div class="food-item-info">
                    <span class="food-item-name">${item.name}</span>
                    <span class="food-item-price">₹${item.price}</span>
                </div>
                <button class="food-add-btn" data-food-idx="${i}" data-stall="${stallId}">
                    <i data-lucide="plus"></i>
                </button>
            </div>
        `).join('');

        lucide.createIcons({ nodes: [container] });

        container.querySelectorAll('.food-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.foodIdx);
                const stall = btn.dataset.stall;
                const item = FOOD_MENUS[stall][idx];
                foodCart.push(item);
                updateCartUI();
                UI.showToast(`Added ${item.name} to cart`, 'success');
            });
        });
    }

    function updateCartUI() {
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        if (!cartItems) return;

        if (foodCart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">No items added yet</p>';
            cartTotal.textContent = '0';
            return;
        }

        cartItems.innerHTML = foodCart.map(item => `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>₹${item.price}</span>
            </div>
        `).join('');

        cartTotal.textContent = foodCart.reduce((s, item) => s + item.price, 0);
    }

    // ---- LOST & FOUND ----
    function setupLostFound() {
        document.getElementById('btn-report-lost')?.addEventListener('click', () => {
            const item = document.getElementById('lost-item').value;
            const location = document.getElementById('lost-location').value;
            const contact = document.getElementById('lost-contact').value;

            if (!item || !location) {
                UI.showToast('Please fill in item and location', 'warning');
                return;
            }

            UI.showToast('📋 Lost item reported! Our team will contact you.', 'success');
            close('modal-lost');

            // Clear form
            document.getElementById('lost-item').value = '';
            document.getElementById('lost-details').value = '';
        });
    }

    // ---- SHARE LOCATION ----
    function setupShareLocation() {
        // Generate code
        const code = 'SP-' + Math.floor(1000 + Math.random() * 9000);
        const codeEl = document.getElementById('share-code');
        if (codeEl) codeEl.textContent = code;

        document.getElementById('btn-copy-code')?.addEventListener('click', () => {
            navigator.clipboard?.writeText(code).then(() => {
                UI.showToast('Code copied to clipboard!', 'success');
            }).catch(() => {
                UI.showToast('Code: ' + code, 'info');
            });
        });

        document.getElementById('btn-find-friend')?.addEventListener('click', () => {
            const friendCode = document.getElementById('friend-code').value;
            if (!friendCode) {
                UI.showToast('Please enter your friend\'s code', 'warning');
                return;
            }
            const resultDiv = document.getElementById('friend-result');
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = `
                <p>🎯 <strong>Friend Found!</strong></p>
                <p>Location: <strong>Block C, Row 8</strong></p>
                <p>Distance: ~120m from you</p>
                <p style="color: var(--accent-green)">Walk towards Food Court 3, then take left stairway.</p>
            `;
        });
    }

    // ---- FEEDBACK ----
    function setupFeedback() {
        let rating = 0;
        const selectedTags = new Set();

        document.querySelectorAll('#rating-stars .star').forEach(star => {
            star.addEventListener('click', () => {
                rating = parseInt(star.dataset.rating);
                document.querySelectorAll('#rating-stars .star').forEach(s => {
                    s.classList.toggle('active', parseInt(s.dataset.rating) <= rating);
                });
                const texts = ['', 'Poor 😞', 'Fair 😐', 'Good 😊', 'Great 😃', 'Awesome 🤩'];
                document.getElementById('rating-text').textContent = texts[rating];
            });

            star.addEventListener('mouseenter', () => {
                const r = parseInt(star.dataset.rating);
                document.querySelectorAll('#rating-stars .star').forEach(s => {
                    s.classList.toggle('active', parseInt(s.dataset.rating) <= r);
                });
            });
        });

        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const tag = btn.dataset.tag;
                if (selectedTags.has(tag)) selectedTags.delete(tag);
                else selectedTags.add(tag);
            });
        });

        document.getElementById('btn-submit-feedback')?.addEventListener('click', () => {
            if (rating === 0) {
                UI.showToast('Please give a star rating', 'warning');
                return;
            }
            UI.showToast(`Thank you for your ${rating}-star feedback! 🎉`, 'success');
            close('modal-feedback');
        });
    }

    // ---- PARKING ----
    function setupParking() {
        const container = document.getElementById('parking-zones');
        if (!container) return;

        container.innerHTML = PARKING_DATA.map(lot => {
            let slotsHTML = '';
            for (let i = 1; i <= lot.total; i++) {
                const isOccupied = i <= lot.occupied;
                slotsHTML += `<div class="parking-slot ${isOccupied ? 'occupied' : 'available'}">${lot.prefix}${i}</div>`;
            }
            const available = lot.total - lot.occupied;
            return `
                <div class="parking-zone">
                    <div class="parking-zone-name">${lot.zone}</div>
                    <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px">
                        <span style="color:var(--accent-green)">${available} available</span> / ${lot.total} total
                    </p>
                    <div class="parking-slots">${slotsHTML}</div>
                </div>
            `;
        }).join('');
    }

    // ---- LEADERBOARD ----
    function setupLeaderboard() {
        const container = document.getElementById('leaderboard-list');
        if (!container) return;

        container.innerHTML = LEADERBOARD_DATA.map((person, i) => {
            const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            return `
                <div class="lb-item">
                    <span class="lb-rank ${rankClass}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1)}</span>
                    <div class="lb-avatar">${person.avatar}</div>
                    <div class="lb-info">
                        <div class="lb-name">${person.name}</div>
                        <div class="lb-tip">"${person.tip}"</div>
                    </div>
                    <span class="lb-points">${person.points} pts</span>
                </div>
            `;
        }).join('');
    }

    // ---- UPGRADES ----
    function setupUpgrades() {
        const container = document.getElementById('upgrade-list');
        if (!container) return;

        const upgrades = [
            { block: 'Block B', row: '3-8', desc: 'Premium East Pavilion — 45% seats available', badge: '₹500 upgrade' },
            { block: 'Block D', row: '1-5', desc: 'West Gallery VIP — Front rows available', badge: '₹1200 upgrade' },
            { block: 'Block E', row: '10-20', desc: 'Upper Deck North — Great aerial view', badge: 'Free upgrade!' },
        ];

        container.innerHTML = upgrades.map(u => `
            <div class="upgrade-item">
                <div class="upgrade-info">
                    <h4>${u.block} — Rows ${u.row}</h4>
                    <p>${u.desc}</p>
                </div>
                <span class="upgrade-badge">${u.badge}</span>
            </div>
        `).join('');
    }

    // ---- NEARBY ----
    function showNearby(block) {
        const facilities = NEARBY_FACILITIES[block] || NEARBY_FACILITIES['A'];
        const container = document.getElementById('nearby-list');
        if (!container) return;

        container.innerHTML = facilities.map(f => {
            const waitColor = f.wait < 5 ? 'background:rgba(0,255,136,0.15);color:#00ff88' :
                            f.wait <= 10 ? 'background:rgba(255,170,0,0.15);color:#ffaa00' :
                            'background:rgba(255,59,92,0.15);color:#ff3b5c';
            return `
                <div class="nearby-item">
                    <div class="nearby-icon"><i data-lucide="${f.icon}"></i></div>
                    <div class="nearby-info">
                        <div class="nearby-name">${f.name}</div>
                        <div class="nearby-distance">${f.distance} away</div>
                    </div>
                    <span class="nearby-wait-badge" style="${waitColor}">${f.wait} min</span>
                </div>
            `;
        }).join('');

        open('modal-nearby');
        lucide.createIcons({ nodes: [container] });
    }

    // ---- NOTIFICATIONS ----
    function setupNotifications() {
        document.getElementById('btn-notifications')?.addEventListener('click', () => {
            updateNotifList();
            open('modal-notifications');
        });

        document.getElementById('btn-clear-notifs')?.addEventListener('click', () => {
            SimEngine.clearNotifications();
            updateNotifList();
            UI.showToast('Notifications cleared', 'info');
        });
    }

    function updateNotifList() {
        const snap = SimEngine.getSnapshot();
        const container = document.getElementById('notif-list');
        if (!container) return;

        if (snap.notifications.length === 0) {
            container.innerHTML = '<p class="empty-notif">No notifications yet</p>';
            return;
        }

        container.innerHTML = snap.notifications.slice(0, 20).map(n => {
            const dotColor = n.type === 'error' ? 'background:#ff3b5c' :
                            n.type === 'warning' ? 'background:#ffaa00' :
                            n.type === 'success' ? 'background:#00ff88' : 'background:#00d4ff';
            return `
                <div class="notif-item">
                    <span class="notif-dot" style="${dotColor}"></span>
                    <div class="notif-content">
                        <div class="notif-text">${n.text}</div>
                        <div class="notif-time">${n.time}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ---- MORE CARDS ----
    function setupMoreCards() {
        document.getElementById('more-parking')?.addEventListener('click', () => open('modal-parking'));
        document.getElementById('more-food')?.addEventListener('click', () => open('modal-food'));
        document.getElementById('more-feedback')?.addEventListener('click', () => open('modal-feedback'));
        document.getElementById('more-leaderboard')?.addEventListener('click', () => open('modal-leaderboard'));
        document.getElementById('more-lost')?.addEventListener('click', () => open('modal-lost'));
        document.getElementById('more-ar')?.addEventListener('click', () => open('modal-ar'));
        document.getElementById('more-share')?.addEventListener('click', () => open('modal-share'));
        document.getElementById('more-upgrade')?.addEventListener('click', () => open('modal-upgrade'));
    }

    return { init, open, close, showNearby };
})();
