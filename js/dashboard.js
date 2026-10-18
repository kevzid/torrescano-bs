// ============================================================
// DASHBOARD — Sistema ABC (Altas, Bajas, Cambios)
// Toda la lógica CRUD con Supabase
// ============================================================

// ── Variables globales ──
let allUsers = [];
let currentEditId = null;

// ── Utilidades ──
function showToast(message, type = 'error') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const icons = { success: '✓', error: '✕', warning: '⚠' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '•'}</span>
    <span class="toast-message">${message}</span>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('visible'));
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ── Autenticación y protección de ruta ──
async function checkAuth() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
      window.location.href = 'index.html';
      return false;
    }

    const user = session.user;
    const displayName = user.user_metadata?.name || user.email || 'Usuario';
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = displayName;
    return true;
  } catch (error) {
    console.error('Error en checkAuth:', error);
    window.location.href = 'index.html';
    return false;
  }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    window.location.href = 'index.html';
  }
});

// ── Cerrar sesión ──
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    try {
      await supabaseClient.auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      showToast('Error al cerrar sesión', 'error');
    }
  });
}


// ============================================================
// CRUD — LEER (Cargar usuarios)
// ============================================================
async function loadUsers() {
  const tbody = document.getElementById('users-body');
  if (allUsers.length === 0 && tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding: 28px; color: var(--text-muted); font-size: 0.875rem;">
          Cargando datos de Supabase...
        </td>
      </tr>
    `;
  }

  try {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;

    allUsers = data || [];
    updateStats();
    renderTable(allUsers);
    updateTableDate();

  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    showToast('Error al cargar la lista de usuarios', 'error');
  }
}

// ── Actualizar estadísticas ──
function updateStats() {
  const total = allUsers.length;
  const admins = allUsers.filter(u => u.rol === 'admin').length;
  const users = allUsers.filter(u => u.rol === 'usuario').length;
  const editors = allUsers.filter(u => u.rol === 'editor').length;

  animateCounter('stat-total', total);
  animateCounter('stat-admins', admins);
  animateCounter('stat-users', users);
  animateCounter('stat-editors', editors);
}

function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  const current = parseInt(el.textContent) || 0;
  const diff = target - current;
  const duration = 400;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(current + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ── Renderizar tabla ──
function renderTable(users) {
  const tbody = document.getElementById('users-body');
  const emptyState = document.getElementById('empty-state');
  const tableCount = document.getElementById('table-count');
  const tableEl = document.querySelector('.users-table');

  if (users.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    tableEl.style.display = 'none';
    tableCount.textContent = 'Mostrando 0 registros';
    return;
  }

  emptyState.classList.add('hidden');
  tableEl.style.display = '';

  tbody.innerHTML = users.map((user, index) => `
    <tr data-id="${user.id}">
      <td style="color:var(--text-muted); font-size:0.8125rem;">${index + 1}</td>
      <td>
        <strong>${escapeHtml(user.nombre || '—')}</strong>
      </td>
      <td>
        <span class="user-email">${escapeHtml(user.email || '—')}</span>
      </td>
      <td>
        <span class="role-badge ${user.rol || 'usuario'}">${capitalizar(user.rol || 'usuario')}</span>
      </td>
      <td>
        <div class="table-actions" style="justify-content:center;">
          <button class="btn-icon edit" title="Editar (Cambio)" onclick="openEditModal('${user.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon delete" title="Dar de baja" onclick="openDeleteModal('${user.id}', '${escapeHtml(user.nombre || user.email)}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  tableCount.textContent = `Mostrando ${users.length} registro${users.length !== 1 ? 's' : ''}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function capitalizar(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


// ============================================================
// CRUD — ALTA (Crear usuario)
// ============================================================
async function createUser(nombre, email, rol) {
  try {
    let payload = { nombre, email, rol };
    
    // Intento 1: Inserción directa
    let { data, error } = await supabaseClient
      .from('usuarios')
      .insert([payload])
      .select();

    // Si la base de datos no tiene autogenerador de ID, generar UUID en el cliente
    if (error && (error.message?.includes('null value in column "id"') || error.code === '23502')) {
      const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      payload.id = generatedId;
      const retry = await supabaseClient
        .from('usuarios')
        .insert([payload])
        .select();
      
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    showToast(`Alta exitosa: ${nombre}`, 'success');
    await loadUsers();
    return true;

  } catch (error) {
    console.error('Error en alta:', error);
    if (error.message?.includes('duplicate') || error.code === '23505') {
      showToast('Ya existe un usuario con ese correo electrónico', 'error');
    } else {
      showToast('Error al crear usuario: ' + (error.message || 'Error desconocido'), 'error');
    }
    return false;
  }
}


// ============================================================
// CRUD — CAMBIO (Actualizar usuario)
// ============================================================
async function updateUser(id, nombre, email, rol) {
  try {
    const { error } = await supabaseClient
      .from('usuarios')
      .update({ nombre, email, rol })
      .eq('id', id);

    if (error) throw error;

    showToast(`Cambio exitoso: ${nombre}`, 'success');
    await loadUsers();
    return true;

  } catch (error) {
    console.error('Error en cambio:', error);
    showToast('Error al actualizar usuario: ' + (error.message || 'Error desconocido'), 'error');
    return false;
  }
}


// ============================================================
// CRUD — BAJA (Eliminar usuario)
// ============================================================
async function deleteUser(id) {
  try {
    const { error } = await supabaseClient
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) throw error;

    showToast('Baja realizada correctamente', 'success');
    await loadUsers();
    return true;

  } catch (error) {
    console.error('Error en baja:', error);
    showToast('Error al dar de baja: ' + (error.message || 'Error desconocido'), 'error');
    return false;
  }
}


// ============================================================
// MODALES — Alta / Cambio
// ============================================================
const modalUser = document.getElementById('modal-user');
const modalDelete = document.getElementById('modal-delete');

function openAddModal() {
  currentEditId = null;
  document.getElementById('modal-user-title').textContent = 'Nueva Alta';
  document.getElementById('btn-save-user').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    Guardar
  `;
  document.getElementById('user-id').value = '';
  document.getElementById('user-nombre').value = '';
  document.getElementById('user-email').value = '';
  document.getElementById('user-rol').value = '';
  modalUser.classList.add('active');
}

function openEditModal(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;

  currentEditId = id;
  document.getElementById('modal-user-title').textContent = 'Editar Usuario (Cambio)';
  document.getElementById('btn-save-user').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    Actualizar
  `;
  document.getElementById('user-id').value = id;
  document.getElementById('user-nombre').value = user.nombre || '';
  document.getElementById('user-email').value = user.email || '';
  document.getElementById('user-rol').value = user.rol || 'usuario';
  modalUser.classList.add('active');
}

function closeUserModal() {
  modalUser.classList.remove('active');
  currentEditId = null;
}

// ── Modal de Baja ──
function openDeleteModal(id, nombre) {
  document.getElementById('delete-user-id').value = id;
  document.getElementById('delete-user-name').textContent = nombre;
  modalDelete.classList.add('active');
}

function closeDeleteModal() {
  modalDelete.classList.remove('active');
}


// ============================================================
// EVENT LISTENERS
// ============================================================

// ── Botón "Nueva Alta" ──
document.getElementById('btn-add-user').addEventListener('click', openAddModal);

// ── Guardar usuario (Alta o Cambio) ──
document.getElementById('btn-save-user').addEventListener('click', async () => {
  const nombre = document.getElementById('user-nombre').value.trim();
  const email = document.getElementById('user-email').value.trim();
  const rol = document.getElementById('user-rol').value;

  // Validar
  if (!nombre) {
    showToast('El nombre es obligatorio', 'warning');
    document.getElementById('user-nombre').focus();
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Ingresa un correo electrónico válido', 'warning');
    document.getElementById('user-email').focus();
    return;
  }
  if (!rol) {
    showToast('Selecciona un rol', 'warning');
    document.getElementById('user-rol').focus();
    return;
  }

  const btn = document.getElementById('btn-save-user');
  btn.disabled = true;

  let success;
  if (currentEditId) {
    success = await updateUser(currentEditId, nombre, email, rol);
  } else {
    success = await createUser(nombre, email, rol);
  }

  btn.disabled = false;

  if (success) {
    closeUserModal();
  }
});

// ── Confirmar Baja ──
document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
  const id = document.getElementById('delete-user-id').value;
  const btn = document.getElementById('btn-confirm-delete');
  btn.disabled = true;

  const success = await deleteUser(id);
  btn.disabled = false;

  if (success) {
    closeDeleteModal();
  }
});

// ── Cerrar modales ──
document.getElementById('modal-user-close').addEventListener('click', closeUserModal);
document.getElementById('btn-cancel-user').addEventListener('click', closeUserModal);
document.getElementById('modal-delete-close').addEventListener('click', closeDeleteModal);
document.getElementById('btn-cancel-delete').addEventListener('click', closeDeleteModal);

// Cerrar al hacer clic fuera del modal
modalUser.addEventListener('click', (e) => {
  if (e.target === modalUser) closeUserModal();
});
modalDelete.addEventListener('click', (e) => {
  if (e.target === modalDelete) closeDeleteModal();
});

// Cerrar con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeUserModal();
    closeDeleteModal();
  }
});

// ── Enter en form de usuario ──
document.getElementById('form-user').addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('btn-save-user').click();
});

// ── Búsqueda ──
document.getElementById('search-users').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();

  if (!query) {
    renderTable(allUsers);
    return;
  }

  const filtered = allUsers.filter(u =>
    (u.nombre || '').toLowerCase().includes(query) ||
    (u.email || '').toLowerCase().includes(query) ||
    (u.rol || '').toLowerCase().includes(query)
  );

  renderTable(filtered);
});

// ── Fecha en footer de tabla ──
function updateTableDate() {
  const el = document.getElementById('table-date');
  if (el) {
    el.textContent = `Última actualización: ${new Date().toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })}`;
  }
}
updateTableDate();


// ── Exponer funciones al scope global para eventos inline ──
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;

// ============================================================
// INICIALIZACIÓN
// ============================================================
async function initDashboard() {
  // 1. Validación de sesión
  const isAuth = await checkAuth();
  // 2. Cargar datos sólo si la sesión es válida
  if (isAuth) {
    await loadUsers();
  }
}

// Ejecutar inmediatamente o cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}


