// Global Initialization
lucide.createIcons();

// --- MOBILE MENU LOGIC ---
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-links');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
}

// Close menu when clicking a link
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        navLinks.classList.remove('open');
    });
});

// --- THEME ENGINE ---
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('hub-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeUI(savedTheme);

themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('hub-theme', target);
    updateThemeUI(target);
});

function updateThemeUI(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.setAttribute('data-lucide', theme === 'dark' ? 'moon' : 'sun');
        lucide.createIcons();
    }
}

// --- DASHBOARD LOGIC ---
let chart;
let ws;
let currentSymbol = 'BTCUSDT';
let wishlist = JSON.parse(localStorage.getItem('myWishlist')) || [];
let currentView = 'market';
const marketCoins = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT'];

window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('liveChart')) {
        initDashboard();
    }
});

function initDashboard() {
    setupSearch();
    renderMarketList();
    switchCoin('BTCUSDT');
    setInterval(renderMarketList, 10000);
}

function setupSearch() {
    const search = document.getElementById('coin-search');
    const results = document.getElementById('search-results');
    if (!search) return;
    
    search.addEventListener('input', async (e) => {
        const val = e.target.value.toUpperCase();
        if (val.length < 1) { results.style.display = 'none'; return; }
        try {
            const res = await fetch(`https://api.binance.com/api/v3/ticker/price`);
            const data = await res.json();
            const matches = data.filter(c => c.symbol.includes(val)).slice(0, 5);
            results.innerHTML = matches.map(c => `<div class="result-item" onclick="switchCoin('${c.symbol}')">${c.symbol}</div>`).join('');
            results.style.display = 'block';
        } catch (e) {}
    });
}

function switchCoin(symbol) {
    currentSymbol = symbol;
    document.getElementById('chart-coin-name').innerText = symbol;
    const results = document.getElementById('search-results');
    if (results) results.style.display = 'none';
    const search = document.getElementById('coin-search');
    if (search) search.value = '';
    
    if (ws) ws.close();
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`);
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.c);
        document.getElementById('chart-coin-price').innerText = `$${price.toLocaleString()}`;
        if (chart) updateChart(price);
    };
    resetChart();
}

function resetChart() {
    if (chart) chart.destroy();
    const canvas = document.getElementById('liveChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ data: [], borderColor: '#6366f1', tension: 0.4, fill: true, backgroundColor: 'rgba(99, 102, 241, 0.1)', pointRadius: 0 }] },
        options: { 
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#848e9c' } } }
        }
    });
}

function updateChart(price) {
    if (!chart) return;
    if (chart.data.labels.length > 25) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
    chart.data.labels.push(""); chart.data.datasets[0].data.push(price);
    chart.update('none');
}

function setView(view) {
    currentView = view;
    document.getElementById('view-market').classList.toggle('active', view === 'market');
    document.getElementById('view-wishlist').classList.toggle('active', view === 'wishlist');
    renderMarketList();
}

async function renderMarketList() {
    const container = document.getElementById('coin-list');
    if (!container) return;
    const list = (currentView === 'market') ? marketCoins : wishlist;
    try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price`);
        const all = await res.json();
        container.innerHTML = list.map(sym => {
            const coin = all.find(c => c.symbol === sym) || { price: '0.00' };
            const isFav = wishlist.includes(sym) ? 'filled' : '';
            return `<div class="coin-row" onclick="switchCoin('${sym}')" style="cursor:pointer">
                <strong>${sym}</strong> <span>$${parseFloat(coin.price).toLocaleString()}</span>
                <i data-lucide="heart" class="wishlist-icon ${isFav}" onclick="toggleWish(event, '${sym}')"></i>
            </div>`;
        }).join('');
        lucide.createIcons();
    } catch (e) {}
}

function toggleWish(e, sym) {
    e.stopPropagation();
    wishlist.includes(sym) ? (wishlist = wishlist.filter(i => i !== sym)) : wishlist.push(sym);
    localStorage.setItem('myWishlist', JSON.stringify(wishlist));
    renderMarketList();
}