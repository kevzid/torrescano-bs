// ============================================================
// RESTABLECER CONTRASEÑA
// Lógica para actualizar contraseña mediante enlace de Supabase
// ============================================================

// ── Estado de la UI ──
function showLoader(btn) {
  btn.disabled = true;
  btn.dataset.originalHtml = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Procesando...';
}

function hideLoader(btn) {
  btn.disabled = false;
  btn.innerHTML = btn.dataset.originalHtml || '<span>Guardar y Entrar</span>';
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

function translateError(errorMsg) {
  const translations = {
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Auth session missing!': 'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.',
    'New password should be different from the old password.': 'La nueva contraseña debe ser diferente a la anterior.',
  };
  return translations[errorMsg] || errorMsg || 'Ocurrió un error al restablecer la contraseña.';
}

function togglePasswordVisibility(inputId, toggleBtn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  toggleBtn.innerHTML = isPassword
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// ── Manejar actualización de contraseña ──
async function handleResetPassword(e) {
  e.preventDefault();
  clearErrors();

  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-new-password');
  const btn = document.getElementById('btn-save-new-password');

  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  let isValid = true;

  if (!newPassword) {
    showError('new-password', 'Ingresa una nueva contraseña.');
    isValid = false;
  } else if (newPassword.length < 6) {
    showError('new-password', 'La contraseña debe tener al menos 6 caracteres.');
    isValid = false;
  }

  if (!confirmPassword) {
    showError('confirm-new-password', 'Confirma tu contraseña.');
    isValid = false;
  } else if (newPassword !== confirmPassword) {
    showError('confirm-new-password', 'Las contraseñas no coinciden.');
    isValid = false;
  }

  if (!isValid) return;

  showLoader(btn);

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    showToast('¡Contraseña actualizada con éxito!', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);

  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    showToast(translateError(error.message));
  } finally {
    hideLoader(btn);
  }
}

// ── Inicialización ──
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reset-password-form');
  if (form) {
    form.addEventListener('submit', handleResetPassword);
  }

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
      const errorEl = input.parentElement?.querySelector('.input-error');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('visible');
      }
    });
  });
});
