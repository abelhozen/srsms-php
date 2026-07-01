/* ============================================================
   SRSMS UI Utilities
   ============================================================ */

let appCurrency = 'TZS';

function setCurrency(c) { appCurrency = c || 'TZS'; }

function formatMoney(amount) {
    const n = Number(amount || 0);
    return `${appCurrency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function daysAgoISO(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function normalizeRoleName(role) {
    return String(role || '').toLowerCase().trim().replace(/\s+/g, '_');
}

function hasAnyRole(role, allowedRoles) {
    const normalized = normalizeRoleName(role);
    return allowedRoles.some(item => normalizeRoleName(item) === normalized);
}

// ---- Toast notifications ----

function ensureToastContainer() {
    let el = document.getElementById('toastContainer');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toastContainer';
        el.className = 'toast-container';
        document.body.appendChild(el);
    }
    return el;
}

function showToast(message, type = 'success') {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3200);
}

function showError(err) {
    const msg = err?.message || (typeof err === 'string' ? err : 'Something went wrong');
    showToast(msg, 'error');
}

// ---- Modal ----

function openModal(html) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'activeModal';
    overlay.innerHTML = html;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    return overlay;
}

function closeModal() {
    const existing = document.getElementById('activeModal');
    if (existing) existing.remove();
}

// ---- Loading spinner block ----

function loadingHtml(text = 'Loading...') {
    return `<div class="page-loading"><div class="loading-spinner"></div></div>`;
}

// ---- Role label mapping ----

const ROLE_LABELS = {
    super_admin: 'Admin',
    admin: 'Admin',
    owner: 'Owner',
    manager: 'Manager',
    accountant: 'Accountant',
    store_keeper: 'Store Keeper',
    cashier: 'Cashier',
    auditor: 'Auditor'
};

function roleLabel(role) { return ROLE_LABELS[role] || role; }

function statusBadge(status) {
    const map = {
        active: 'green', completed: 'green', paid: 'green', approved: 'green',
        pending: 'amber', warning: 'amber', partial: 'amber',
        expired: 'red', damaged: 'red', voided: 'red', rejected: 'red', critical: 'red', unpaid: 'red',
        inactive: 'gray', disabled: 'gray', suspended: 'gray', depleted: 'gray'
    };
    const color = map[status] || 'gray';
    return `<span class="badge badge-${color}">${escapeHtml(status)}</span>`;
}
