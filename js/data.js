/* ========================================
   StadiumPulse — Data & Constants
   ======================================== */

const STADIUM_CONFIG = {
    name: 'Wankhede Stadium',
    event: 'IPL Finals 2026',
    capacity: 33000,
    eventDate: new Date('2026-04-18T19:30:00+05:30'),
};

const ZONES = [
    // Gates
    { id: 'gate-a', name: 'Gate A', type: 'gates', capacity: 800, x: 400, y: 50, icon: 'door-open' },
    { id: 'gate-b', name: 'Gate B', type: 'gates', capacity: 800, x: 750, y: 300, icon: 'door-open' },
    { id: 'gate-c', name: 'Gate C', type: 'gates', capacity: 800, x: 400, y: 550, icon: 'door-open' },
    { id: 'gate-d', name: 'Gate D', type: 'gates', capacity: 800, x: 50, y: 300, icon: 'door-open' },
    // Food Courts
    { id: 'food-1', name: 'Food Court 1', type: 'food', capacity: 400, x: 250, y: 130, icon: 'utensils' },
    { id: 'food-2', name: 'Food Court 2', type: 'food', capacity: 400, x: 560, y: 130, icon: 'utensils' },
    { id: 'food-3', name: 'Food Court 3', type: 'food', capacity: 400, x: 560, y: 470, icon: 'utensils' },
    { id: 'food-4', name: 'Food Court 4', type: 'food', capacity: 400, x: 250, y: 470, icon: 'utensils' },
    // Washrooms
    { id: 'wash-n', name: 'Washroom North', type: 'washroom', capacity: 200, x: 310, y: 100, icon: 'shower-head' },
    { id: 'wash-e', name: 'Washroom East', type: 'washroom', capacity: 200, x: 680, y: 300, icon: 'shower-head' },
    { id: 'wash-s', name: 'Washroom South', type: 'washroom', capacity: 200, x: 500, y: 500, icon: 'shower-head' },
    { id: 'wash-w', name: 'Washroom West', type: 'washroom', capacity: 200, x: 120, y: 300, icon: 'shower-head' },
    // Medical
    { id: 'medical-1', name: 'Medical Bay', type: 'medical', capacity: 50, x: 200, y: 250, icon: 'heart-pulse' },
    // Parking
    { id: 'parking-1', name: 'Parking Lot 1', type: 'parking', capacity: 1200, x: 150, y: 50, icon: 'car' },
    { id: 'parking-2', name: 'Parking Lot 2', type: 'parking', capacity: 1200, x: 650, y: 550, icon: 'car' },
    // Seating blocks
    { id: 'block-a', name: 'Block A', type: 'seating', capacity: 5500, x: 400, y: 180, icon: 'armchair' },
    { id: 'block-b', name: 'Block B', type: 'seating', capacity: 5500, x: 580, y: 250, icon: 'armchair' },
    { id: 'block-c', name: 'Block C', type: 'seating', capacity: 5500, x: 530, y: 380, icon: 'armchair' },
    { id: 'block-d', name: 'Block D', type: 'seating', capacity: 5500, x: 280, y: 380, icon: 'armchair' },
    { id: 'block-e', name: 'Block E', type: 'seating', capacity: 5500, x: 220, y: 250, icon: 'armchair' },
    { id: 'block-f', name: 'Block F', type: 'seating', capacity: 5000, x: 400, y: 420, icon: 'armchair' },
];

const FOOD_MENUS = {
    1: [
        { name: 'Classic Burger', price: 250 },
        { name: 'Cheese Fries', price: 180 },
        { name: 'Chicken Wings', price: 320 },
        { name: 'Veggie Wrap', price: 200 },
        { name: 'Onion Rings', price: 150 },
    ],
    2: [
        { name: 'Margherita Pizza', price: 350 },
        { name: 'Pepperoni Pizza', price: 420 },
        { name: 'Garlic Bread', price: 150 },
        { name: 'Pasta Alfredo', price: 280 },
        { name: 'Cheesy Dip Fries', price: 200 },
    ],
    3: [
        { name: 'Vada Pav', price: 60 },
        { name: 'Pav Bhaji', price: 150 },
        { name: 'Samosa (2 pcs)', price: 80 },
        { name: 'Chole Bhature', price: 180 },
        { name: 'Masala Dosa', price: 140 },
    ],
    4: [
        { name: 'Cold Coffee', price: 150 },
        { name: 'Fresh Lime Soda', price: 100 },
        { name: 'Mango Lassi', price: 120 },
        { name: 'Popcorn (Large)', price: 200 },
        { name: 'Nachos & Salsa', price: 220 },
    ],
};

const LEADERBOARD_DATA = [
    { name: 'Arjun M.', tip: 'Gate D has zero wait right now!', points: 245, avatar: 'AM' },
    { name: 'Priya S.', tip: 'Food Court 3 has the best vada pav', points: 198, avatar: 'PS' },
    { name: 'Rohit K.', tip: 'Washroom near Block E is cleanest', points: 167, avatar: 'RK' },
    { name: 'Sneha D.', tip: 'Come via metro exit 2 for fastest entry', points: 143, avatar: 'SD' },
    { name: 'Vikram P.', tip: 'Parking Lot 2 still has spots near exit', points: 121, avatar: 'VP' },
    { name: 'Ananya R.', tip: 'Medical bay is super quick if needed', points: 98, avatar: 'AR' },
    { name: 'Karan J.', tip: 'Block B has the best view of the pitch!', points: 87, avatar: 'KJ' },
];

const PARKING_DATA = [
    { zone: 'Lot A — North', prefix: 'A', total: 20, occupied: 14 },
    { zone: 'Lot B — East', prefix: 'B', total: 20, occupied: 8 },
    { zone: 'Lot C — South', prefix: 'C', total: 20, occupied: 18 },
    { zone: 'Lot D — West (VIP)', prefix: 'D', total: 15, occupied: 5 },
];

const TRANSLATIONS = {
    en: {
        liveMap: 'Live Map',
        queues: 'Queues',
        admin: 'Admin',
        analytics: 'Analytics',
        planner: 'Planner',
        more: 'More',
        findRoute: 'Find My Route',
        nearby: 'Nearby',
        food: 'Food',
        share: 'Share',
        lostFound: 'Lost & Found',
        totalAttendees: 'Total',
        broadcast: 'Broadcast',
        emergency: 'SOS Emergency',
    },
    hi: {
        liveMap: 'लाइव मैप',
        queues: 'कतारें',
        admin: 'एडमिन',
        analytics: 'विश्लेषण',
        planner: 'प्लानर',
        more: 'और',
        findRoute: 'मेरा रास्ता खोजें',
        nearby: 'पास में',
        food: 'खाना',
        share: 'शेयर',
        lostFound: 'खोया और पाया',
        totalAttendees: 'कुल',
        broadcast: 'प्रसारण',
        emergency: 'आपातकाल SOS',
    },
    mr: {
        liveMap: 'लाइव्ह नकाशा',
        queues: 'रांगा',
        admin: 'ॲडमिन',
        analytics: 'विश्लेषण',
        planner: 'प्लॅनर',
        more: 'अधिक',
        findRoute: 'माझा मार्ग शोधा',
        nearby: 'जवळपास',
        food: 'खाद्य',
        share: 'शेअर',
        lostFound: 'हरवलेले आणि सापडलेले',
        totalAttendees: 'एकूण',
        broadcast: 'प्रसारण',
        emergency: 'आणीबाणी SOS',
    },
};

const BLOCK_GATE_MAP = {
    A: { gate: 'Gate A', path: ['Gate A entrance', 'North corridor', 'Stairway N2', 'Block A — Row entrance'] },
    B: { gate: 'Gate B', path: ['Gate B entrance', 'East pavilion lobby', 'Escalator E1', 'Block B — Row entrance'] },
    C: { gate: 'Gate C', path: ['Gate C entrance', 'South corridor', 'Stairway S1', 'Block C — Row entrance'] },
    D: { gate: 'Gate D', path: ['Gate D entrance', 'West gallery lobby', 'Escalator W1', 'Block D — Row entrance'] },
    E: { gate: 'Gate A', path: ['Gate A entrance', 'North corridor', 'Upper deck stairway', 'Block E — Row entrance'] },
    F: { gate: 'Gate C', path: ['Gate C entrance', 'South corridor', 'Upper deck stairway', 'Block F — Row entrance'] },
};

const NEARBY_FACILITIES = {
    A: [
        { name: 'Washroom North', icon: 'shower-head', distance: '45m', wait: 3 },
        { name: 'Food Court 1', icon: 'utensils', distance: '60m', wait: 7 },
        { name: 'Medical Bay', icon: 'heart-pulse', distance: '80m', wait: 0 },
        { name: 'Gate A Exit', icon: 'door-open', distance: '30m', wait: 2 },
    ],
    B: [
        { name: 'Washroom East', icon: 'shower-head', distance: '50m', wait: 4 },
        { name: 'Food Court 2', icon: 'utensils', distance: '55m', wait: 5 },
        { name: 'Gate B Exit', icon: 'door-open', distance: '40m', wait: 3 },
    ],
    C: [
        { name: 'Washroom South', icon: 'shower-head', distance: '40m', wait: 5 },
        { name: 'Food Court 3', icon: 'utensils', distance: '65m', wait: 8 },
        { name: 'Food Court 4', icon: 'utensils', distance: '70m', wait: 6 },
        { name: 'Gate C Exit', icon: 'door-open', distance: '35m', wait: 4 },
    ],
    D: [
        { name: 'Washroom West', icon: 'shower-head', distance: '55m', wait: 2 },
        { name: 'Food Court 4', icon: 'utensils', distance: '50m', wait: 6 },
        { name: 'Medical Bay', icon: 'heart-pulse', distance: '40m', wait: 0 },
        { name: 'Gate D Exit', icon: 'door-open', distance: '45m', wait: 1 },
    ],
    E: [
        { name: 'Washroom North', icon: 'shower-head', distance: '70m', wait: 3 },
        { name: 'Food Court 1', icon: 'utensils', distance: '85m', wait: 7 },
        { name: 'Gate A Exit', icon: 'door-open', distance: '60m', wait: 2 },
    ],
    F: [
        { name: 'Washroom South', icon: 'shower-head', distance: '65m', wait: 5 },
        { name: 'Food Court 3', icon: 'utensils', distance: '75m', wait: 8 },
        { name: 'Gate C Exit', icon: 'door-open', distance: '50m', wait: 4 },
    ],
};
