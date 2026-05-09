/**
 * Logic for Buzón de SugerENCIAS GHL
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbwHfiL-yUDcwo_AC0-An1F5BJuZZdzYyctMj2P4ZB33XyGTGxwsMFOwc0XBh1gAtyAG/exec';
const ADMIN_USER = 'jefeTH';
const ADMIN_PASS = 'GHLHoliday2026$$';

// DOM Elements
const mainContent = document.getElementById('main-content');
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');

const suggestionForm = document.getElementById('suggestion-form');
const loginForm = document.getElementById('login-form');

let areaChartInstance = null;

// Initial Load
window.addEventListener('DOMContentLoaded', () => {
    loadPublicWall();
});

// Navigation Logic
document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('login-section');
});

document.getElementById('back-to-main').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('main-layout');
});

document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('isAdmin');
    showSection('main-layout');
});

function showSection(id) {
    // Hide everything first
    [document.querySelector('.main-layout'), loginSection, adminDashboard].forEach(s => {
        if (s) s.classList.add('hidden');
    });

    const target = (id === 'main-layout') ? document.querySelector('.main-layout') : document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
    }
    
    if (id === 'admin-dashboard') loadAdminData();
    if (id === 'main-layout') loadPublicWall();
}

// Form Submission
suggestionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const originalHTML = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    const formData = new FormData(suggestionForm);
    const payload = {
        action: 'addSuggestion',
        nombre: formData.get('nombre'),
        apellido: formData.get('apellido'),
        area: formData.get('area'),
        sugerencia: formData.get('sugerencia')
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if (result.success) {
            alert('¡Gracias! Tu sugerencia ha sido enviada.');
            suggestionForm.reset();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (err) {
        alert('Error de conexión. Inténtalo de nuevo.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
});

// Admin Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    if (u === ADMIN_USER && p === ADMIN_PASS) {
        sessionStorage.setItem('isAdmin', 'true');
        showSection('admin-dashboard');
    } else {
        alert('Credenciales incorrectas');
    }
});

// Public Wall Logic
async function loadPublicWall() {
    const grid = document.getElementById('approved-suggestions-grid');
    grid.innerHTML = '<div style="text-align: center; grid-column: 1/-1; padding: 2rem; color: var(--brand-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando historias de éxito...</div>';

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        const approved = data.filter(s => s.estado === 'Aprobado');

        if (approved.length === 0) {
            grid.innerHTML = '<div style="text-align: center; grid-column: 1/-1; padding: 2rem; color: var(--brand-muted);">Aún no hay sugerencias aprobadas. ¡Sé el primero!</div>';
            return;
        }

        grid.innerHTML = '';
        approved.reverse().forEach(s => {
            const card = document.createElement('div');
            card.className = 'suggestion-card';
            card.innerHTML = `
                <div class="area-badge">${s.area}</div>
                <div class="suggestion-content">"${s.sugerencia}"</div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        grid.innerHTML = '<div style="text-align: center; grid-column: 1/-1; padding: 2rem; color: red;">Error al cargar datos.</div>';
    }
}

// Admin Logic
async function loadAdminData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        document.getElementById('total-count').textContent = data.length;
        document.getElementById('pending-count').textContent = data.filter(s => s.estado === 'Pendiente' || s.estado === 'En Proceso').length;
        document.getElementById('approved-count').textContent = data.filter(s => s.estado === 'Aprobado').length;

        const tbody = document.getElementById('suggestions-body');
        tbody.innerHTML = '';
        data.reverse().forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(s.fecha).toLocaleDateString()}</td>
                <td>${s.nombre} ${s.apellido}</td>
                <td>${s.area}</td>
                <td><span class="badge bg-${s.estado.toLowerCase().replace(' ', '-')}">${s.estado}</span></td>
                <td style="display: flex; gap: 0.5rem;">
                    <button class="action-btn btn-check" onclick="updateStatus('${s.id}', 'Aprobado')" title="Aprobar"><i class="fas fa-check"></i></button>
                    <button class="action-btn btn-clock" onclick="updateStatus('${s.id}', 'En Proceso')" title="En Proceso"><i class="fas fa-clock"></i></button>
                    <button class="action-btn btn-x" onclick="updateStatus('${s.id}', 'Rechazado')" title="Rechazar"><i class="fas fa-times"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        renderChart(data);
    } catch (err) {
        console.error(err);
    }
}

function renderChart(data) {
    const areaCounts = {};
    data.forEach(s => areaCounts[s.area] = (areaCounts[s.area] || 0) + 1);

    const ctx = document.getElementById('areaChart').getContext('2d');
    if (areaChartInstance) areaChartInstance.destroy();
    
    areaChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(areaCounts),
            datasets: [{
                label: 'Sugerencias',
                data: Object.values(areaCounts),
                backgroundColor: '#1e3a8a',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

async function updateStatus(id, status) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateStatus', id, status })
        });
        const result = await response.json();
        if (result.success) loadAdminData();
    } catch (err) {
        alert('Error al actualizar');
    }
}

// Auto-session
if (sessionStorage.getItem('isAdmin')) showSection('admin-dashboard');
