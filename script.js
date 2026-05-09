/**
 * Client-side logic for Buzón de Sugerencias
 */

// Replace this with your Google Apps Script Web App URL after deployment
const API_URL = 'https://script.google.com/macros/s/AKfycbwHfiL-yUDcwo_AC0-An1F5BJuZZdzYyctMj2P4ZB33XyGTGxwsMFOwc0XBh1gAtyAG/exec';

// Auth credentials
const ADMIN_USER = 'jefeTH';
const ADMIN_PASS = 'GHLHoliday2026$$';

// DOM Elements
const formSection = document.getElementById('form-section');
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');

const suggestionForm = document.getElementById('suggestion-form');
const loginForm = document.getElementById('login-form');

const goToLogin = document.getElementById('go-to-login');
const goToForm = document.getElementById('go-to-form');
const logoutBtn = document.getElementById('logout-btn');

let areaChartInstance = null;

// Navigation
const navButtons = document.querySelectorAll('.nav-btn');
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        switchSection(btn.dataset.target);
    });
});

goToLogin.addEventListener('click', () => switchSection('login'));
logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('isAdmin');
    switchSection('form');
});

function switchSection(section) {
    [formSection, loginSection, adminDashboard, document.getElementById('public-suggestions-section')].forEach(s => s.classList.remove('active'));
    
    if (section === 'form-section') {
        formSection.classList.add('active');
    }
    if (section === 'login') {
        loginSection.classList.add('active');
    }
    if (section === 'public-suggestions-section') {
        document.getElementById('public-suggestions-section').classList.add('active');
        loadPublicData();
    }
    if (section === 'admin') {
        if (sessionStorage.getItem('isAdmin')) {
            adminDashboard.classList.add('active');
            loadData();
        } else {
            loginSection.classList.add('active');
        }
    }
}

// Public Data Loading
async function loadPublicData() {
    const grid = document.getElementById('approved-suggestions-grid');
    grid.innerHTML = '<div class="loading-state"><i class="fas fa-circle-notch fa-spin"></i> Cargando ideas brillantes...</div>';

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        const approved = data.filter(s => s.estado === 'Aprobado');
        
        if (approved.length === 0) {
            grid.innerHTML = '<div class="loading-state">Aún no hay sugerencias aprobadas. ¡Sé el primero en inspirarnos!</div>';
            return;
        }

        grid.innerHTML = '';
        approved.forEach(s => {
            const date = new Date(s.fecha).toLocaleDateString();
            const card = document.createElement('div');
            card.className = 'suggestion-card';
            card.innerHTML = `
                <div class="card-area">${s.area}</div>
                <div class="card-text">"${s.sugerencia}"</div>
                <div class="card-footer">
                    <div class="card-author">${s.nombre} ${s.apellido.charAt(0)}.</div>
                    <div class="card-date">${date}</div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        grid.innerHTML = '<div class="loading-state">Error al cargar las sugerencias.</div>';
    }
}

// Form Submission
suggestionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const originalText = btn.innerHTML;
    
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
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (result.success) {
            alert('¡Sugerencia enviada con éxito! Gracias por tu colaboración.');
            suggestionForm.reset();
        } else {
            throw new Error(result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Hubo un error al enviar la sugerencia. Asegúrate de que el API_URL esté configurado.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// Admin Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        sessionStorage.setItem('isAdmin', 'true');
        switchSection('admin');
    } else {
        alert('Usuario o contraseña incorrectos');
    }
});

// Load and Display Data
async function loadData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        
        renderDashboard(data);
        renderTable(data);
    } catch (err) {
        console.error(err);
        // alert('Error al cargar datos. Verifica la conexión con Google Sheets.');
    }
}

function renderDashboard(data) {
    document.getElementById('total-count').textContent = data.length;
    document.getElementById('pending-count').textContent = data.filter(s => s.estado === 'Pendiente' || s.estado === 'En Proceso').length;
    document.getElementById('approved-count').textContent = data.filter(s => s.estado === 'Aprobado').length;

    const areaCounts = {};
    data.forEach(s => {
        areaCounts[s.area] = (areaCounts[s.area] || 0) + 1;
    });

    const ctx = document.getElementById('areaChart').getContext('2d');
    
    if (areaChartInstance) areaChartInstance.destroy();
    
    areaChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(areaCounts),
            datasets: [{
                label: 'Sugerencias por Área',
                data: Object.values(areaCounts),
                backgroundColor: 'rgba(99, 102, 241, 0.5)',
                borderColor: '#6366f1',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderTable(data) {
    const tbody = document.getElementById('suggestions-body');
    tbody.innerHTML = '';

    data.reverse().forEach(s => {
        const tr = document.createElement('tr');
        const date = new Date(s.fecha).toLocaleDateString();
        
        tr.innerHTML = `
            <td>${date}</td>
            <td>${s.nombre} ${s.apellido}</td>
            <td>${s.area}</td>
            <td>${s.sugerencia}</td>
            <td><span class="status-badge status-${s.estado.toLowerCase().replace(' ', '-')}">${s.estado}</span></td>
            <td>
                <button class="action-btn btn-check" title="Aprobar" onclick="updateStatus('${s.id}', 'Aprobado')"><i class="fas fa-check"></i></button>
                <button class="action-btn btn-clock" title="En Proceso" onclick="updateStatus('${s.id}', 'En Proceso')"><i class="fas fa-clock"></i></button>
                <button class="action-btn btn-x" title="Rechazar" onclick="updateStatus('${s.id}', 'Rechazado')"><i class="fas fa-times"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateStatus(id, newStatus) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateStatus',
                id: id,
                status: newStatus
            })
        });
        const result = await response.json();
        if (result.success) {
            loadData();
        } else {
            alert('Error al actualizar: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Error de conexión');
    }
}

// Auto-check session
if (sessionStorage.getItem('isAdmin')) {
    switchSection('admin');
}
