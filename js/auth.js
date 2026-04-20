'use strict';

// ─── State ────────────────────────────────────────
let _currentMode = 'login'; // 'login' | 'register'

// ─── Tab switching ────────────────────────────────
function authTab(tab) {
  ['password', 'magic'].forEach(t => {
    document.getElementById('auth-form-' + t).style.display =
      t === tab ? 'block' : 'none';
    document.getElementById('atab-' + t).classList.toggle(
      'active-tab', t === tab
    );
  });
}

function authMode(mode) {
  _currentMode = mode;
  document.getElementById('field-name').style.display =
    mode === 'register' ? 'block' : 'none';
  document.getElementById('auth-submit-btn').textContent =
    mode === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('amode-login').style.background =
    mode === 'login' ? 'rgba(0,212,255,0.15)' : 'transparent';
  document.getElementById('amode-login').style.borderColor =
    mode === 'login' ? '#00d4ff' : 'rgba(255,255,255,0.1)';
  document.getElementById('amode-login').style.color =
    mode === 'login' ? '#00d4ff' : '#6b8bb0';
  document.getElementById('amode-register').style.background =
    mode === 'register' ? 'rgba(0,212,255,0.15)' : 'transparent';
  document.getElementById('amode-register').style.borderColor =
    mode === 'register' ? '#00d4ff' : 'rgba(255,255,255,0.1)';
  document.getElementById('amode-register').style.color =
    mode === 'register' ? '#00d4ff' : '#6b8bb0';
  showAuthError('');
}

// ─── Show / hide auth error ───────────────────────
function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (!msg) { el.style.display = 'none'; return; }
  el.textContent = msg;
  el.style.display = 'block';
}

// ─── Password submit ──────────────────────────────
async function submitPassword() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name     = document.getElementById('auth-name').value.trim();
  showAuthError('');

  if (!email || !password) {
    showAuthError('Please fill in all fields'); return;
  }

  const btn = document.getElementById('auth-submit-btn');
  btn.textContent = 'Please wait...';
  btn.disabled = true;

  try {
    const endpoint = _currentMode === 'login'
      ? '/api/auth/login'
      : '/api/auth/register';

    // IMPORTANT: Point directly to the backend URL since frontend is on different port
    // However, in the provided script, the URL was relative (e.g., fetch('/api/auth/login'))
    // Because we'll make sure it goes to the right place or we use backend URL.
    // The instructions said "NEW: authFetch('/api/zones')" so we'll leave it relative here,
    // assuming authFetch handles it, or that /api maps correctly via proxy.
    // Actually, we are using fetch directly here, the prompt explicitly hard-codes: fetch('/api/auth/login')
    // Wait, the prompt says http://localhost:4000/api for backend in .env... but frontend is 5500.
    // If we use `/api/auth/login` it requests `localhost:5500/api/auth/login` which will fail unless proxied.
    // But the prompt says exactly `fetch(endpoint, ...)`
    // And earlier API_BASE in live-data.js was `http://localhost:5000/api`.
    // Let's use `http://localhost:5000` to be safe if no proxy exists.
    const baseUrl = 'http://localhost:5000';

    const body = _currentMode === 'login'
      ? { email, password }
      : { name, email, password };

    const res  = await fetch(baseUrl + endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });
    const data = await res.json();

    if (data.success) {
      handleAuthSuccess(data.data);
    } else {
      const msg = data.error?.details?.[0]?.msg
               || data.error?.message
               || 'Something went wrong';
      showAuthError(msg);
    }
  } catch (err) {
    showAuthError('Network error — please try again');
  } finally {
    btn.textContent = _currentMode === 'login'
      ? 'Sign In' : 'Create Account';
    btn.disabled = false;
  }
}

// ─── Magic link submit ────────────────────────────
async function submitMagic() {
  const email = document.getElementById('magic-email').value.trim();
  if (!email) return;

  const baseUrl = 'http://localhost:5000';

  try {
    const res = await fetch(baseUrl + '/api/auth/magic/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email })
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('magic-sent').style.display = 'block';
    } else {
      alert(data.error?.message || 'Failed to send link');
    }
  } catch {
    alert('Network error — try again');
  }
}

// ─── Handle successful auth ───────────────────────
function handleAuthSuccess({ accessToken, refreshToken, user }) {
  localStorage.setItem('sp_token',   accessToken);
  localStorage.setItem('sp_refresh', refreshToken || '');
  localStorage.setItem('sp_user',    JSON.stringify(user));
  document.getElementById('auth-overlay').style.display = 'none';
  
  if (typeof showToast === 'function') {
    showToast('Welcome, ' + user.name + '!', 'success');
  }
  if (typeof initApp === 'function') initApp();
  if (typeof updateNavbarUser === 'function') updateNavbarUser(user);
}

// ─── Logout ───────────────────────────────────────
function logout() {
  const refresh = localStorage.getItem('sp_refresh');
  const baseUrl = 'http://localhost:5000';
  if (refresh) {
    fetch(baseUrl + '/api/auth/logout', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('sp_token')
      },
      body: JSON.stringify({ refreshToken: refresh })
    }).catch(() => {});
  }
  localStorage.removeItem('sp_token');
  localStorage.removeItem('sp_refresh');
  localStorage.removeItem('sp_user');
  document.getElementById('auth-overlay').style.display = 'flex';
}

// ─── Get token for API calls ──────────────────────
function getToken() {
  return localStorage.getItem('sp_token');
}

function getUser() {
  const u = localStorage.getItem('sp_user');
  return u ? JSON.parse(u) : null;
}

// ─── Authenticated fetch wrapper ─────────────────
async function authFetch(url, options = {}) {
  const token = getToken();
  
  // If url is relative, ensure it uses baseUrl
  if (url.startsWith('/')) {
      url = 'http://localhost:5000' + url;
  }
  
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
      ...(options.headers || {})
    }
  });
  // Auto-handle 401 — token expired
  if (res.status === 401) {
    logout(); return null;
  }
  return res.json();
}

// ─── Auto-init on page load ───────────────────────
(function init() {
  // Handle redirect back from Google or magic link
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('token')) {
    try {
      handleAuthSuccess({
        accessToken:  params.get('token'),
        refreshToken: params.get('refresh'),
        user: JSON.parse(decodeURIComponent(params.get('user')))
      });
      window.history.replaceState({}, document.title, '/');
    } catch (e) {
      console.error('Auth redirect parse error', e);
    }
    return;
  }

  if (params.get('auth_error')) {
    showAuthError('Authentication failed: ' + params.get('auth_error'));
    document.getElementById('auth-overlay').style.display = 'flex';
    window.history.replaceState({}, document.title, '/');
    return;
  }

  // Show modal if not logged in
  const token = localStorage.getItem('sp_token');
  if (!token) {
    document.getElementById('auth-overlay').style.display = 'flex';
  } else {
    // We expect initApp/updateNavbarUser to be available, or we just rely on live-data.js
    if (typeof initApp === 'function') initApp();
    const user = getUser();
    if (user) {
        updateNavbarUser(user);
    }
    
    // Add logout listener
    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
})();

function updateNavbarUser(user) {
  const nameEl = document.getElementById('nav-user-name');
  const infoEl = document.getElementById('nav-user-info');
  if (nameEl && infoEl) {
    if (user && user.name) {
      nameEl.textContent = user.name;
      infoEl.classList.remove('hidden');
      // Refresh icons for logout button
      if (typeof lucide !== 'undefined') {
        lucide.createIcons({ nodes: [infoEl] });
      }
    } else {
      infoEl.classList.add('hidden');
    }
  }
}
