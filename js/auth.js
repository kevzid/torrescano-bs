// ============================================================
// MÓDULO DE AUTENTICACIÓN
// Login, Registro y Recuperación de contraseña
// ============================================================

// ── Estado de la UI ──
function showLoader(btn) {
  btn.disabled = true;
  btn.dataset.originalText = btn.textContent;
  btn.innerHTML = '<span class="spinner"></span>';
}

function hideLoader(btn) {
  btn.disabled = false;
  btn.textContent = btn.dataset.originalText || 'Enviar';
}

function showError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorEl = input?.parentElement?.querySelector('.input-error');
  if (input) input.classList.add('error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
  }
}

function clearErrors() {
  document.querySelectorAll('.input-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
  document.querySelectorAll('.form-input').forEach(el => {
    el.classList.remove('error');
  });
}

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

// ── Traducción de errores de Supabase (opcional) ──
function translateError(errorMsg) {
  const translations = {
    'Invalid login credentials': 'Credenciales inválidas. Verifica tu correo y contraseña.',
    'User already registered': 'Ya existe una cuenta con este correo.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'For security purposes, you can only request this once every 60 seconds': 'Por seguridad, solo puedes solicitar esto una vez cada 60 segundos.',
  };
  return translations[errorMsg] || errorMsg || 'Ocurrió un error inesperado. Intenta de nuevo.';
}

// ── Validaciones ──
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateLoginForm(email, password) {
  let valid = true;
  clearErrors();

  if (!email) {
    showError('login-email', 'El correo es obligatorio.');
    valid = false;
  } else if (!validateEmail(email)) {
    showError('login-email', 'Ingresa un correo válido.');
    valid = false;
  }

  if (!password) {
    showError('login-password', 'La contraseña es obligatoria.');
    valid = false;
  }

  return valid;
}

function validateRegisterForm(name, email, password, confirmPassword) {
  let valid = true;
  clearErrors();

  if (!name || name.trim().length < 2) {
    showError('register-name', 'Ingresa tu nombre completo.');
    valid = false;
  }

  if (!email) {
    showError('register-email', 'El correo es obligatorio.');
    valid = false;
  } else if (!validateEmail(email)) {
    showError('register-email', 'Ingresa un correo válido.');
    valid = false;
  }

  if (!password) {
    showError('register-password', 'La contraseña es obligatoria.');
    valid = false;
  } else if (password.length < 6) {
    showError('register-password', 'Mínimo 6 caracteres.');
    valid = false;
  }

  if (password !== confirmPassword) {
    showError('register-confirm', 'Las contraseñas no coinciden.');
    valid = false;
  }

  return valid;
}

// ── Inicio de Sesión ──
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('.btn-primary');

  if (!validateLoginForm(email, password)) return;

  showLoader(btn);

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    showToast('¡Bienvenido de vuelta!', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 800);
  } catch (error) {
    console.error('Login error:', error);
    showToast(translateError(error.message));
  } finally {
    hideLoader(btn);
  }
}

// ── Registro ──
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm').value;
  const btn = e.target.querySelector('.btn-primary');

  if (!validateRegisterForm(name, email, password, confirmPassword)) return;

  showLoader(btn);

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name // Guarda el nombre en los metadatos del usuario
        }
      }
    });

    if (error) throw error;

    // Guardar el perfil en la tabla 'usuarios'
    if (data.user) {
      const { error: dbError } = await supabaseClient
        .from('usuarios')
        .insert([{ id: data.user.id, nombre: name, email: email, rol: 'usuario' }]);
      if (dbError) console.error("Error guardando perfil en tabla:", dbError);
    }

    if (data.session) {
      showToast('¡Cuenta creada exitosamente!', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 800);
    } else {
      showToast('¡Cuenta creada! Revisa tu correo para confirmar tu registro antes de iniciar sesión.', 'success');
      switchToLogin();
    }
  } catch (error) {
    console.error('Register error:', error);
    showToast(translateError(error.message));
  } finally {
    hideLoader(btn);
  }
}

// ── Recuperación de contraseña ──
async function handlePasswordRecovery() {
  const emailInput = document.getElementById('recovery-email');
  const email = emailInput.value.trim();
  const btn = document.getElementById('btn-send-recovery');

  if (!email || !validateEmail(email)) {
    showToast('Ingresa un correo electrónico válido', 'warning');
    emailInput.focus();
    return;
  }

  showLoader(btn);

  try {
    const redirectUrl = new URL('reset-password.html', window.location.href).href;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) throw error;

    showToast('¡Enlace enviado! Revisa tu bandeja de entrada.', 'success');
    closeRecoveryModal();

  } catch (error) {
    console.error('Recovery error:', error);
    showToast(translateError(error.message));
  } finally {
    hideLoader(btn);
  }
}

// ── Modal de recuperación ──
function openRecoveryModal() {
  document.getElementById('recovery-email').value = '';
  document.getElementById('modal-recovery').classList.add('active');
}

function closeRecoveryModal() {
  document.getElementById('modal-recovery').classList.remove('active');
}

// ── Toggle Login / Registro ──
function switchToRegister() {
  document.getElementById('login-form-container').classList.add('hidden');
  document.getElementById('register-form-container').classList.remove('hidden');
  
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  if (tabLogin) tabLogin.classList.remove('active');
  if (tabRegister) tabRegister.classList.add('active');

  clearErrors();
}

function switchToLogin() {
  document.getElementById('register-form-container').classList.add('hidden');
  document.getElementById('login-form-container').classList.remove('hidden');
  
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  if (tabRegister) tabRegister.classList.remove('active');
  if (tabLogin) tabLogin.classList.add('active');

  clearErrors();
}

// ── Toggle visibilidad contraseña ──
function togglePasswordVisibility(inputId, toggleBtn) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  toggleBtn.innerHTML = isPassword
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// ── Inicialización ──
document.addEventListener('DOMContentLoaded', () => {
  // Formularios
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  // Links de cambio
  document.querySelectorAll('[data-switch="register"]').forEach(el =>
    el.addEventListener('click', (e) => { e.preventDefault(); switchToRegister(); })
  );
  document.querySelectorAll('[data-switch="login"]').forEach(el =>
    el.addEventListener('click', (e) => { e.preventDefault(); switchToLogin(); })
  );

  // Toggle contraseñas
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.dataset.target;
      togglePasswordVisibility(inputId, btn);
    });
  });

  // Limpiar errores al escribir
  document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('error');
      const errorEl = input.parentElement.querySelector('.input-error');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('visible');
      }
    });
  });

  // ── Recuperación de contraseña ──
  const btnForgot = document.getElementById('btn-forgot-password');
  if (btnForgot) {
    btnForgot.addEventListener('click', (e) => {
      e.preventDefault();
      openRecoveryModal();
    });
  }

  const btnSendRecovery = document.getElementById('btn-send-recovery');
  if (btnSendRecovery) {
    btnSendRecovery.addEventListener('click', handlePasswordRecovery);
  }

  const btnCancelRecovery = document.getElementById('btn-cancel-recovery');
  if (btnCancelRecovery) {
    btnCancelRecovery.addEventListener('click', closeRecoveryModal);
  }

  const modalRecoveryClose = document.getElementById('modal-recovery-close');
  if (modalRecoveryClose) {
    modalRecoveryClose.addEventListener('click', closeRecoveryModal);
  }

  const modalRecovery = document.getElementById('modal-recovery');
  if (modalRecovery) {
    modalRecovery.addEventListener('click', (e) => {
      if (e.target === modalRecovery) closeRecoveryModal();
    });
  }

  // Submit recovery con Enter
  const recoveryForm = document.getElementById('recovery-form');
  if (recoveryForm) {
    recoveryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handlePasswordRecovery();
    });
  }

  // Cerrar modales con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalRecovery) {
      closeRecoveryModal();
    }
  });

  // Redirigir al dashboard si ya hay sesión iniciada
  if (typeof supabaseClient !== 'undefined' && supabaseClient.auth) {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = 'dashboard.html';
      }
    }).catch(err => console.warn('Sesión no encontrada o error al validar:', err));
  }
});
