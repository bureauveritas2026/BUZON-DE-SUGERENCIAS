/**
 * Buzón de Ideas - GHL Holiday
 * Lógica Frontend con Actualizaciones Optimistas
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbwHfiL-yUDcwo_AC0-An1F5BJuZZdzYyctMj2P4ZB33XyGTGxwsMFOwc0XBh1gAtyAG/exec';
const ADMIN_USER = 'jefeTH';
const ADMIN_PASS = 'GHLHoliday2026$$';

// Estado Local
let localData = [];
let barChartInstance = null;
let pieChartInstance = null;

// --- NAVEGACIÓN ---
const views = {
    form: document.getElementById('view-form'),
    wall: document.getElementById('view-wall'),
    login: document.getElementById('view-login'),
    admin: document.getElementById('view-admin')
};

const tabs = document.querySelectorAll('.tab-btn');

function showView(viewId) {
    // Hide all
    Object.values(views).forEach(v => { if (v) v.classList.add('hidden'); });
    
    // Show target
    if (views[viewId]) {
        views[viewId].classList.remove('hidden');
    }

    // Load data based on view
    if (viewId === 'wall') loadWallData();
    if (viewId === 'admin') loadAdminDashboard();
}

tabs.forEach(btn => {
    btn.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.target.replace('view-', '');
        showView(target);
    });
});

document.getElementById('show-admin-login').addEventListener('click', (e) => {
    e.preventDefault();
    showView('login');
});

document.querySelectorAll('.back-to-home').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        tabs[0].click(); // Go to form tab
    });
});

document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('isAdmin');
    tabs[0].click();
});

// Auto Login check
if (sessionStorage.getItem('isAdmin')) {
    // Optional: Auto redirect to admin if already logged in. But let's leave them on form until they click admin.
}

// --- FORMULARIO DE SUGERENCIAS ---
document.getElementById('suggestion-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    const formData = new FormData(e.target);
    const payload = {
        action: 'addSuggestion',
        nombre: formData.get('nombre'),
        apellido: formData.get('apellido'),
        area: formData.get('area'),
        sugerencia: formData.get('sugerencia')
    };

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await res.json();
        
        if (result.success) {
            alert('¡Fantástico! Tu idea ha sido recibida y será evaluada pronto.');
            e.target.reset();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (err) {
        alert('Error de red. Intenta nuevamente.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// --- MURO DE ÉXITO ---
async function loadWallData() {
    const container = document.getElementById('wall-container');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Cargando ideas brillantes...</div>';

    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        const approved = data.filter(s => s.estado === 'Aprobado').reverse();

        if (approved.length === 0) {
            container.innerHTML = '<div class="loading-state"><i class="fas fa-seedling" style="font-size:3rem; margin-bottom:1rem; display:block;"></i>Aún no hay sugerencias aprobadas. ¡Sé el primero en inspirarnos!</div>';
            return;
        }

        container.innerHTML = '';
        approved.forEach(s => {
            const card = document.createElement('div');
            card.className = 'idea-card';
            card.innerHTML = `
                <span class="area-tag"><i class="fas fa-building"></i> ${s.area}</span>
                <p class="idea-text">${s.sugerencia}</p>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = '<div class="loading-state text-muted">Error al cargar el muro.</div>';
    }
}

// --- ADMIN LOGIN ---
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    if (u === ADMIN_USER && p === ADMIN_PASS) {
        sessionStorage.setItem('isAdmin', 'true');
        document.getElementById('login-form').reset();
        showView('admin');
    } else {
        alert('Credenciales inválidas');
    }
});

// --- ADMIN DASHBOARD ---
async function loadAdminDashboard() {
    // Si no es admin, fuera
    if (!sessionStorage.getItem('isAdmin')) {
        showView('login');
        return;
    }

    try {
        const res = await fetch(API_URL);
        localData = await res.json();
        
        populateAreaFilter();
        renderAdminUI();
        
        // Listeners for filters
        document.getElementById('filter-status').addEventListener('change', renderAdminUI);
        document.getElementById('filter-area').addEventListener('change', renderAdminUI);

    } catch (err) {
        console.error("Error loading admin data", err);
    }
}

function populateAreaFilter() {
    const areas = [...new Set(localData.map(s => s.area))].sort();
    const select = document.getElementById('filter-area');
    select.innerHTML = '<option value="all">Todas las áreas</option>';
    areas.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a;
        opt.textContent = a;
        select.appendChild(opt);
    });
}

function renderAdminUI() {
    // 1. Get filtered data
    const statusFilter = document.getElementById('filter-status').value;
    const areaFilter = document.getElementById('filter-area').value;

    let filtered = localData;
    if (statusFilter !== 'all') filtered = filtered.filter(s => s.estado === statusFilter);
    if (areaFilter !== 'all') filtered = filtered.filter(s => s.area === areaFilter);

    // 2. Render Table
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = '';
    
    // Sort newest first
    const sorted = [...filtered].reverse();
    
    sorted.forEach(s => {
        const tr = document.createElement('tr');
        const dateStr = new Date(s.fecha).toLocaleDateString();
        
        // Formatear estado para la clase CSS
        const badgeClass = 'b-' + s.estado.toLowerCase().replace(' ', '-');

        tr.innerHTML = `
            <td style="white-space: nowrap;">${dateStr}</td>
            <td>${s.nombre} ${s.apellido}</td>
            <td><span class="area-tag" style="margin:0;">${s.area}</span></td>
            <td><div class="sug-text-cell" title="${s.sugerencia}">${s.sugerencia}</div></td>
            <td><span class="badge ${badgeClass}">${s.estado}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action a-check" onclick="updateSuggestionStatus('${s.id}', 'Aprobado')" title="Aprobar"><i class="fas fa-check"></i></button>
                    <button class="btn-action a-clock" onclick="updateSuggestionStatus('${s.id}', 'En Proceso')" title="En Proceso"><i class="fas fa-clock"></i></button>
                    <button class="btn-action a-cross" onclick="updateSuggestionStatus('${s.id}', 'Rechazado')" title="Rechazar"><i class="fas fa-times"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // 3. Render Stats (based on ALL data, not filtered)
    document.getElementById('stat-total').textContent = localData.length;
    document.getElementById('stat-pending').textContent = localData.filter(s => s.estado === 'Pendiente' || s.estado === 'En Proceso').length;
    document.getElementById('stat-approved').textContent = localData.filter(s => s.estado === 'Aprobado').length;

    // 4. Render Charts (based on Filtered data so they interact)
    renderCharts(filtered);
}

function renderCharts(data) {
    // Bar Chart: Areas
    const areaCounts = {};
    data.forEach(s => { areaCounts[s.area] = (areaCounts[s.area] || 0) + 1; });

    const ctxBar = document.getElementById('barChart').getContext('2d');
    if (barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: Object.keys(areaCounts),
            datasets: [{
                label: 'Sugerencias',
                data: Object.values(areaCounts),
                backgroundColor: '#0d9488',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Pie Chart: Status
    const statusCounts = { 'Aprobado': 0, 'Pendiente': 0, 'En Proceso': 0, 'Rechazado': 0 };
    data.forEach(s => { if (statusCounts[s.estado] !== undefined) statusCounts[s.estado]++; });

    const ctxPie = document.getElementById('pieChart').getContext('2d');
    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: ['#10b981', '#eab308', '#3b82f6', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            },
            cutout: '60%'
        }
    });
}

// --- OPTIMISTIC UPDATES ---
async function updateSuggestionStatus(id, newStatus) {
    // 1. Optimistic Update Local Data
    const itemIndex = localData.findIndex(s => s.id === id);
    if (itemIndex > -1) {
        localData[itemIndex].estado = newStatus;
        // Re-render immediately
        renderAdminUI();
    }

    // 2. Send Background Request
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateStatus', id: id, status: newStatus })
        });
        const result = await response.json();
        if (!result.success) {
            console.error("Fallo la actualización en el servidor:", result.error);
            // Optionally revert the state if failed, but for internal tools it's okay to just alert
        }
    } catch (err) {
        console.error("Error de red al actualizar estado:", err);
    }
}
