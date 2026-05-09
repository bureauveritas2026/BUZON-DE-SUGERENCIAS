/**
 * Logic for Sugerencias GHL
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbwHfiL-yUDcwo_AC0-An1F5BJuZZdzYyctMj2P4ZB33XyGTGxwsMFOwc0XBh1gAtyAG/exec';
const ADMIN_USER = 'jefeTH';
const ADMIN_PASS = 'GHLHoliday2026$$';

// Elements
const sections = document.querySelectorAll('.section');
const tabButtons = document.querySelectorAll('.tab-btn');
const suggestionForm = document.getElementById('suggestion-form');
const loginForm = document.getElementById('login-form');

let areaChartInstance = null;

// Tab Navigation
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        switchSection(target);
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Other Nav
document.getElementById('go-to-login').addEventListener('click', () => switchSection('login-section'));
document.getElementById('back-to-form').addEventListener('click', () => switchSection('form-section'));
document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('isAdmin');
    switchSection('form-section');
});

function switchSection(id) {
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    if (id === 'wall-section') loadWall();
    if (id === 'admin-dashboard') loadAdmin();
}

// Form Submission
suggestionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const originalContent = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    const formData = new FormData(suggestionForm);
    const data = {
        action: 'addSuggestion',
        nombre: formData.get('nombre'),
        apellido: formData.get('apellido'),
        area: formData.get('area'),
        sugerencia: formData.get('sugerencia')
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        const result = await response.json();
        
        if (result.success) {
            alert('¡Tu idea ha sido enviada con éxito! Gracias por participar.');
            suggestionForm.reset();
        } else {
            throw new Error(result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Error al enviar. Verifica tu conexión.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
});

// Admin Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        sessionStorage.setItem('isAdmin', 'true');
        switchSection('admin-dashboard');
    } else {
        alert('Credenciales inválidas');
    }
});

// Load Success Wall
async function loadWall() {
    const grid = document.getElementById('wall-grid');
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:4rem;"><i class="fas fa-circle-notch fa-spin fa-2x"></i></div>';

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        const approved = data.filter(s => s.estado === 'Aprobado');

        if (approved.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:4rem; color:#94a3b8;">Aún no hay historias de éxito. ¡Envía tu idea hoy!</div>';
            return;
        }

        grid.innerHTML = '';
        approved.reverse().forEach(s => {
            const date = new Date(s.fecha).toLocaleDateString();
            const initial = s.nombre.charAt(0);
            const card = document.createElement('div');
            card.className = 'success-card';
            card.innerHTML = `
                <div class="area-tag">${s.area}</div>
                <div class="quote-text">"${s.sugerencia}"</div>
                <div class="author-info">
                    <div class="author-avatar">${initial}</div>
                    <div class="author-details">
                        <span class="author-name">${s.nombre} ${s.apellido}</span>
                        <span class="post-date">${date}</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:4rem; color:red;">Error al conectar con la base de datos.</div>';
    }
}

// Load Admin Data
async function loadAdmin() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        renderAdminStats(data);
        renderAdminTable(data);
        renderAdminChart(data);
    } catch (err) {
        console.error(err);
    }
}

function renderAdminStats(data) {
    document.getElementById('total-count').textContent = data.length;
    document.getElementById('pending-count').textContent = data.filter(s => s.estado === 'Pendiente').length;
    document.getElementById('approved-count').textContent = data.filter(s => s.estado === 'Aprobado').length;
}

function renderAdminTable(data) {
    const tbody = document.getElementById('suggestions-body');
    tbody.innerHTML = '';

    data.reverse().forEach(s => {
        const tr = document.createElement('tr');
        const date = new Date(s.fecha).toLocaleDateString();
        tr.innerHTML = `
            <td>${date}</td>
            <td style="font-weight:600;">${s.nombre} ${s.apellido}</td>
            <td>${s.area}</td>
            <td><span class="badge badge-${s.estado.toLowerCase()}">${s.estado}</span></td>
            <td>
                <button class="action-btn" style="color:var(--success);" onclick="updateStatus('${s.id}', 'Aprobado')"><i class="fas fa-check"></i></button>
                <button class="action-btn" style="color:var(--danger);" onclick="updateStatus('${s.id}', 'Rechazado')"><i class="fas fa-times"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAdminChart(data) {
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
                backgroundColor: '#3b82f6',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
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
        if (result.success) loadAdmin();
    } catch (err) {
        alert('Error al actualizar');
    }
}

// Auto-session
if (sessionStorage.getItem('isAdmin')) switchSection('admin-dashboard');
