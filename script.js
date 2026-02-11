// Configurazione API
const API_URL = 'http://localhost:5000/api';

// Stato dell'applicazione
let isLoggedIn = false;
let ruoliCache = [];

// ==================== LOGIN ====================
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            isLoggedIn = true;
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('dashboardSection').style.display = 'block';
            
            // Carica tutti i dati
            loadDashboardData();
            showSection('registro');
        } else {
            alert('Credenziali errate!');
        }
    } catch (error) {
        console.error('Errore login:', error);
        alert('Errore di connessione al server');
    }
}

function logout() {
    isLoggedIn = false;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
}

// ==================== NAVIGAZIONE ====================
function showSection(section) {
    // Nascondi tutte le sezioni
    const sections = ['registro', 'stipendi', 'ruoli', 'propagandisti', 'credenziali'];
    sections.forEach(s => {
        document.getElementById(s + 'Section').style.display = 'none';
    });

    // Mostra la sezione richiesta
    document.getElementById(section + 'Section').style.display = 'block';

    // Aggiorna active class nel nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');

    // Carica dati specifici della sezione
    switch(section) {
        case 'registro':
            loadTesseramenti();
            break;
        case 'ruoli':
            loadRuoli();
            break;
        case 'propagandisti':
            loadPropagandisti();
            break;
        case 'credenziali':
            loadUtenti();
            break;
    }
}

// ==================== DASHBOARD ====================
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const stats = await response.json();

        document.getElementById('totalTesseramenti').textContent = stats.totale_tesseramenti || 0;
        document.getElementById('validiCount').textContent = stats.stati?.valido || 0;
        document.getElementById('invalidiCount').textContent = stats.stati?.invalido || 0;
        document.getElementById('topPropagandista').textContent = stats.top_propagandista || '-';
    } catch (error) {
        console.error('Errore caricamento stats:', error);
    }
}

// ==================== TESSERAMENTI ====================
async function loadTesseramenti() {
    try {
        const response = await fetch(`${API_URL}/tesseramenti`);
        const tesseramenti = await response.json();

        const tbody = document.getElementById('tesseramentiBody');
        tbody.innerHTML = '';

        tesseramenti.forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${t.id}</td>
                <td>${t.data}</td>
                <td>${t.propagandista}</td>
                <td>${t.tesserato}</td>
                <td>${t.lavoro}</td>
                <td>${t.telegram || '-'}</td>
                <td>
                    <span class="stato-badge stato-${t.stato}">${t.stato.toUpperCase()}</span>
                </td>
                <td>
                    <select onchange="cambiaStato(${t.id}, this.value)" class="stato-select">
                        <option value="neutro" ${t.stato === 'neutro' ? 'selected' : ''}>⚪ Neutro</option>
                        <option value="valido" ${t.stato === 'valido' ? 'selected' : ''}>✅ Valido</option>
                        <option value="invalido" ${t.stato === 'invalido' ? 'selected' : ''}>❌ Invalido</option>
                    </select>
                    <button onclick="eliminaTesseramento(${t.id})" class="action-btn delete">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Errore caricamento tesseramenti:', error);
    }
}

async function cambiaStato(id, stato) {
    try {
        const response = await fetch(`${API_URL}/tesseramenti/${id}/stato`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stato })
        });

        const data = await response.json();
        if (data.success) {
            loadTesseramenti();
            loadDashboardData();
        }
    } catch (error) {
        console.error('Errore cambio stato:', error);
    }
}

async function eliminaTesseramento(id) {
    if (!confirm('Sei sicuro di voler eliminare questo tesseramento?')) return;

    try {
        const response = await fetch(`${API_URL}/tesseramenti/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            loadTesseramenti();
            loadDashboardData();
        }
    } catch (error) {
        console.error('Errore eliminazione:', error);
    }
}

// ==================== STIPENDI ====================
async function calcolaStipendi() {
    try {
        const response = await fetch(`${API_URL}/stipendi`);
        const stipendi = await response.json();

        const container = document.getElementById('stipendiContainer');
        
        if (stipendi.length === 0) {
            container.innerHTML = '<p class="no-data">Nessun propagandista trovato</p>';
            return;
        }

        let html = `
            <div class="table-container">
                <table class="stipendi-table">
                    <thead>
                        <tr>
                            <th>Propagandista</th>
                            <th>@Telegram</th>
                            <th>Ruolo</th>
                            <th>Tesseramenti</th>
                            <th>Paga/Unità</th>
                            <th>Stipendio Totale</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let totaleStipendi = 0;
        stipendi.forEach(s => {
            totaleStipendi += s.stipendio;
            html += `
                <tr>
                    <td><strong>${s.nome}</strong></td>
                    <td>${s.telegram || '-'}</td>
                    <td>${s.ruolo}</td>
                    <td>${s.tesseramenti}</td>
                    <td>€${s.paga.toFixed(2)}</td>
                    <td><span class="stipendio-amount">€${s.stipendio.toFixed(2)}</span></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5"><strong>TOTALE</strong></td>
                            <td><strong>€${totaleStipendi.toFixed(2)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Errore calcolo stipendi:', error);
    }
}

// ==================== RUOLI ====================
async function loadRuoli() {
    try {
        const response = await fetch(`${API_URL}/ruoli`);
        const ruoli = await response.json();
        ruoliCache = ruoli;

        const tbody = document.getElementById('ruoliBody');
        tbody.innerHTML = '';

        ruoli.forEach(r => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${r.id}</td>
                <td>${r.nome}</td>
                <td>€${r.paga.toFixed(2)}</td>
                <td>
                    <button onclick="showModificaRuolo(${r.id}, '${r.nome}', ${r.paga})" class="action-btn edit">✏️</button>
                    <button onclick="eliminaRuolo(${r.id})" class="action-btn delete">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Errore caricamento ruoli:', error);
    }
}

function showAggiungiRuolo() {
    document.getElementById('modalTitle').textContent = '➕ Nuovo Ruolo';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group">
            <label>Nome Ruolo</label>
            <input type="text" id="ruoloNome" placeholder="Es. Propagandista Senior">
        </div>
        <div class="form-group">
            <label>Paga per Tesseramento (€)</label>
            <input type="number" id="ruoloPaga" step="0.01" min="0" placeholder="5.00">
        </div>
        <button onclick="creaRuolo()" class="neon-button">CREA RUOLO</button>
    `;
    document.getElementById('modal').style.display = 'block';
}

function showModificaRuolo(id, nome, paga) {
    document.getElementById('modalTitle').textContent = '✏️ Modifica Ruolo';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group">
            <label>Nome Ruolo</label>
            <input type="text" id="ruoloNome" value="${nome}">
        </div>
        <div class="form-group">
            <label>Paga per Tesseramento (€)</label>
            <input type="number" id="ruoloPaga" step="0.01" min="0" value="${paga}">
        </div>
        <button onclick="modificaRuolo(${id})" class="neon-button">SALVA MODIFICHE</button>
    `;
    document.getElementById('modal').style.display = 'block';
}

async function creaRuolo() {
    const nome = document.getElementById('ruoloNome').value;
    const paga = parseFloat(document.getElementById('ruoloPaga').value) || 0;

    try {
        const response = await fetch(`${API_URL}/ruoli`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, paga })
        });

        const data = await response.json();
        if (data.success) {
            closeModal();
            loadRuoli();
        } else {
            alert('Errore: ' + data.message);
        }
    } catch (error) {
        console.error('Errore creazione ruolo:', error);
    }
}

async function modificaRuolo(id) {
    const nome = document.getElementById('ruoloNome').value;
    const paga = parseFloat(document.getElementById('ruoloPaga').value);

    try {
        const response = await fetch(`${API_URL}/ruoli/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, paga })
        });

        const data = await response.json();
        if (data.success) {
            closeModal();
            loadRuoli();
        }
    } catch (error) {
        console.error('Errore modifica ruolo:', error);
    }
}

async function eliminaRuolo(id) {
    if (!confirm('Sei sicuro di voler eliminare questo ruolo?')) return;

    try {
        const response = await fetch(`${API_URL}/ruoli/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            loadRuoli();
        }
    } catch (error) {
        console.error('Errore eliminazione ruolo:', error);
    }
}

// ==================== PROPAGANDISTI ====================
async function loadPropagandisti() {
    try {
        const [propagandistiRes, ruoliRes] = await Promise.all([
            fetch(`${API_URL}/propagandisti`),
            fetch(`${API_URL}/ruoli`)
        ]);

        const propagandisti = await propagandistiRes.json();
        const ruoli = await ruoliRes.json();
        ruoliCache = ruoli;

        const tbody = document.getElementById('propagandistiBody');
        tbody.innerHTML = '';

        propagandisti.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${p.id}</td>
                <td><strong>${p.nome}</strong></td>
                <td>${p.telegram || '-'}</td>
                <td>${p.ruolo_nome || 'Nessun ruolo'}</td>
                <td>€${p.ruolo_paga?.toFixed(2) || '0.00'}</td>
                <td>
                    <button onclick="showModificaPropagandista(${p.id}, '${p.nome}', ${p.ruolo_id}, '${p.telegram}')" class="action-btn edit">✏️</button>
                    <button onclick="eliminaPropagandista(${p.id})" class="action-btn delete">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Errore caricamento propagandisti:', error);
    }
}

function showAggiungiPropagandista() {
    let ruoliOptions = '<option value="">Seleziona un ruolo</option>';
    ruoliCache.forEach(r => {
        ruoliOptions += `<option value="${r.id}">${r.nome} (€${r.paga}/tess.)</option>`;
    });

    document.getElementById('modalTitle').textContent = '➕ Nuovo Propagandista';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group">
            <label>Nickname</label>
            <input type="text" id="propNome" placeholder="Nickname del propagandista">
        </div>
        <div class="form-group">
            <label>@Telegram</label>
            <input type="text" id="propTelegram" placeholder="@username">
        </div>
        <div class="form-group">
            <label>Ruolo</label>
            <select id="propRuolo">
                ${ruoliOptions}
            </select>
        </div>
        <button onclick="creaPropagandista()" class="neon-button">AGGIUNGI</button>
    `;
    document.getElementById('modal').style.display = 'block';
}

function showModificaPropagandista(id, nome, ruoloId, telegram) {
    let ruoliOptions = '';
    ruoliCache.forEach(r => {
        const selected = r.id === ruoloId ? 'selected' : '';
        ruoliOptions += `<option value="${r.id}" ${selected}>${r.nome} (€${r.paga}/tess.)</option>`;
    });

    document.getElementById('modalTitle').textContent = '✏️ Modifica Propagandista';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group">
            <label>Nickname</label>
            <input type="text" id="propNome" value="${nome}">
        </div>
        <div class="form-group">
            <label>@Telegram</label>
            <input type="text" id="propTelegram" value="${telegram || ''}">
        </div>
        <div class="form-group">
            <label>Ruolo</label>
            <select id="propRuolo">
                ${ruoliOptions}
            </select>
        </div>
        <button onclick="modificaPropagandista(${id})" class="neon-button">SALVA</button>
    `;
    document.getElementById('modal').style.display = 'block';
}

async function creaPropagandista() {
    const nome = document.getElementById('propNome').value;
    const ruolo_id = document.getElementById('propRuolo').value;
    const telegram = document.getElementById('propTelegram').value;

    if (!nome) {
        alert('Inserisci il nickname');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/propagandisti`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, ruolo_id, telegram })
        });

        const data = await response.json();
        if (data.success) {
            closeModal();
            loadPropagandisti();
        }
    } catch (error) {
        console.error('Errore creazione propagandista:', error);
    }
}

async function modificaPropagandista(id) {
    const nome = document.getElementById('propNome').value;
    const ruolo_id = document.getElementById('propRuolo').value;
    const telegram = document.getElementById('propTelegram').value;

    try {
        const response = await fetch(`${API_URL}/propagandisti/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, ruolo_id, telegram })
        });

        const data = await response.json();
        if (data.success) {
            closeModal();
            loadPropagandisti();
        }
    } catch (error) {
        console.error('Errore modifica propagandista:', error);
    }
}

async function eliminaPropagandista(id) {
    if (!confirm('Sei sicuro di voler eliminare questo propagandista?')) return;

    try {
        const response = await fetch(`${API_URL}/propagandisti/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            loadPropagandisti();
        }
    } catch (error) {
        console.error('Errore eliminazione propagandista:', error);
    }
}

// ==================== CREDENZIALI UTENTI ====================
async function loadUtenti() {
    try {
        const response = await fetch(`${API_URL}/utenti`);
        const utenti = await response.json();

        const tbody = document.getElementById('utentiBody');
        tbody.innerHTML = '';

        utenti.forEach(u => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${new Date(u.created_at).toLocaleDateString('it-IT')}</td>
                <td>
                    <button onclick="showModificaUtente(${u.id}, '${u.username}')" class="action-btn edit">✏️</button>
                    ${u.username !== 'admin' ? `<button onclick="eliminaUtente(${u.id})" class="action-btn delete">🗑️</button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Errore caricamento utenti:', error);
    }
}

function showAggiungiUtente() {
    document.getElementById('modalTitle').textContent = '➕ Nuovo Utente';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group">
            <label>Username</label>
            <input type="text" id="nuovoUsername" placeholder="username">
        </div>
        <div class="form-group">
            <label>Password</label>
            <input type="password" id="nuovaPassword" placeholder="********">
        </div>
        <button onclick="creaUtente()" class="neon-button">CREA UTENTE</button>
    `;
    document.getElementById('modal').style.display = 'block';
}

function showModificaUtente(id, username) {
    document.getElementById('modalTitle').textContent = '✏️ Modifica Utente';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group">
            <label>Username</label>
            <input type="text" id="modUsername" value="${username}">
        </div>
        <div class="form-group">
            <label>Nuova Password (lascia vuoto per non cambiare)</label>
            <input type="password" id="modPassword" placeholder="********">
        </div>
        <button onclick="modificaUtente(${id})" class="neon-button">SALVA</button>
    `;
    document.getElementById('modal').style.display = 'block';
}

async function creaUtente() {
    const username = document.getElementById('nuovoUsername').value;
    const password = document.getElementById('nuovaPassword').value;

    if (!username || !password) {
        alert('Inserisci username e password');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/utenti`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.success) {
            closeModal();
            loadUtenti();
        } else {
            alert('Username già esistente');
        }
    } catch (error) {
        console.error('Errore creazione utente:', error);
    }
}

async function modificaUtente(id) {
    const username = document.getElementById('modUsername').value;
    const password = document.getElementById('modPassword').value;

    try {
        const response = await fetch(`${API_URL}/utenti/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username, 
                password: password || undefined 
            })
        });

        const data = await response.json();
        if (data.success) {
            closeModal();
            loadUtenti();
        }
    } catch (error) {
        console.error('Errore modifica utente:', error);
    }
}

async function eliminaUtente(id) {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;

    try {
        const response = await fetch(`${API_URL}/utenti/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            loadUtenti();
        }
    } catch (error) {
        console.error('Errore eliminazione utente:', error);
    }
}

// ==================== UTILITY ====================
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Chiudi modal cliccando fuori
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Carica ruoli all'avvio
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_URL}/ruoli`);
        ruoliCache = await response.json();
    } catch (error) {
        console.error('Errore caricamento ruoli:', error);
    }
});
