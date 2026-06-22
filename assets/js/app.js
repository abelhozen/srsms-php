/* ============================================================
   SRSMS App Shell
   Router + role-based sidebar + page mounting
   ============================================================ */

const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    pos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9h18M3 9l1.5-5h15L21 9M3 9v10a1 1 0 001 1h16a1 1 0 001-1V9M9 13h6"/></svg>',
    products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></svg>',
    sales: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h2l2.4 12.4a2 2 0 002 1.6h8.2a2 2 0 002-1.6L21 8H6"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>',
    expenses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v5a1 1 0 001 1h5M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"/><path d="M9 14h6M9 17h6"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 005 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 5a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09c0 .68.39 1.29 1 1.51.62.25 1.33.12 1.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019 9c.25.62.85 1.04 1.51 1H21a2 2 0 010 4h-.09c-.68 0-1.29.39-1.51 1z"/></svg>',
    audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
    suppliers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    customers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>'
};

// Nav config per role: [{ key, label, icon, section }]
const NAV_CONFIG = {
    super_admin: [
        { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { key: 'pos', label: 'Point of Sale', icon: 'pos' },
        { key: 'products', label: 'Products & Stock', icon: 'products' },
        { key: 'sales', label: 'Sales History', icon: 'sales' },
        { key: 'expenses', label: 'Expenses', icon: 'expenses' },
        { key: 'suppliers', label: 'Suppliers', icon: 'suppliers' },
        { key: 'customers', label: 'Customers', icon: 'customers' },
        { key: 'reports', label: 'Reports', icon: 'reports' },
        { key: 'users', label: 'Users & Roles', icon: 'users' },
        { key: 'audit', label: 'Audit Logs', icon: 'audit' },
        { key: 'settings', label: 'System Settings', icon: 'settings' },
    ],
    owner: [
        { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { key: 'sales', label: 'Sales History', icon: 'sales' },
        { key: 'products', label: 'Products & Stock', icon: 'products' },
        { key: 'expenses', label: 'Expenses', icon: 'expenses' },
        { key: 'suppliers', label: 'Suppliers', icon: 'suppliers' },
        { key: 'customers', label: 'Customers', icon: 'customers' },
        { key: 'reports', label: 'Reports', icon: 'reports' },
        { key: 'settings', label: 'System Settings', icon: 'settings' },
    ],
    manager: [
        { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { key: 'pos', label: 'Point of Sale', icon: 'pos' },
        { key: 'products', label: 'Products & Stock', icon: 'products' },
        { key: 'sales', label: 'Sales History', icon: 'sales' },
        { key: 'expenses', label: 'Expenses', icon: 'expenses' },
        { key: 'suppliers', label: 'Suppliers', icon: 'suppliers' },
        { key: 'customers', label: 'Customers', icon: 'customers' },
        { key: 'reports', label: 'Reports', icon: 'reports' },
        { key: 'users', label: 'Users', icon: 'users' },
    ],
    cashier: [
        { key: 'pos', label: 'Point of Sale', icon: 'pos' },
        { key: 'sales', label: 'My Sales', icon: 'sales' },
        { key: 'customers', label: 'Customers', icon: 'customers' },
    ],
    store_keeper: [
        { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { key: 'products', label: 'Products & Stock', icon: 'products' },
        { key: 'suppliers', label: 'Suppliers', icon: 'suppliers' },
        { key: 'reports', label: 'Inventory Reports', icon: 'reports' },
    ],
    accountant: [
        { key: 'dashboard', label: 'Financial Dashboard', icon: 'dashboard' },
        { key: 'expenses', label: 'Expenses', icon: 'expenses' },
        { key: 'reports', label: 'Reports', icon: 'reports' },
    ],
    auditor: [
        { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { key: 'sales', label: 'Sales History', icon: 'sales' },
        { key: 'audit', label: 'Audit Logs', icon: 'audit' },
        { key: 'reports', label: 'Reports', icon: 'reports' },
    ],
};

let currentPage = null;

function getDefaultPage(role) {
    const nav = NAV_CONFIG[role] || [];
    return nav.length ? nav[0].key : 'dashboard';
}

function renderShell() {
    const user = Store.user;
    if (!user) return renderLogin();

    setCurrency(window.__shopCurrency || 'TZS');

    const nav = NAV_CONFIG[user.role] || [];
    const navHtml = nav.map(item => `
        <div class="nav-item" data-page="${item.key}" onclick="navigateTo('${item.key}')">
            ${ICONS[item.icon] || ''}
            <span>${item.label}</span>
        </div>
    `).join('');

    document.getElementById('root').innerHTML = `
        <div class="app-shell">
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-brand">
                    <div class="mark">S</div>
                    <div>
                        <div class="name">SRSMS</div>
                        <div class="tagline">Retail Intelligence</div>
                    </div>
                </div>
                <div class="sidebar-user">
                    <div class="uname">${escapeHtml(user.fullName)}</div>
                    <span class="urole">${escapeHtml(roleLabel(user.role))}</span>
                </div>
                <nav class="sidebar-nav" id="sidebarNav">${navHtml}</nav>
                <div class="sidebar-footer">
                    <button class="logout-btn" onclick="handleLogout()">
                        ${ICONS.logout}
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            <div class="main-content">
                <header class="topbar">
                    <h1 id="pageTitle">Dashboard</h1>
                    <div class="topbar-right">
                        <span class="topbar-date" id="topbarDate"></span>
                        <button class="bell-btn" onclick="navigateTo('notifications')">
                            ${ICONS.bell}
                            <span class="dot" id="notifDot"></span>
                        </button>
                    </div>
                </header>
                <main class="page-body" id="pageBody">${loadingHtml()}</main>
            </div>
        </div>
    `;

    document.getElementById('topbarDate').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    checkNotifications();
    navigateTo(getDefaultPage(user.role));
}

async function checkNotifications() {
    try {
        const res = await Api.notifications();
        const unread = (res.notifications || []).filter(n => !n.is_read);
        const dot = document.getElementById('notifDot');
        if (dot) dot.classList.toggle('show', unread.length > 0);
    } catch { /* silent */ }
}

const PAGE_TITLES = {
    dashboard: 'Dashboard',
    pos: 'Point of Sale',
    products: 'Products & Stock',
    sales: 'Sales History',
    expenses: 'Expenses',
    suppliers: 'Suppliers',
    customers: 'Customers',
    reports: 'Reports',
    users: 'Users & Roles',
    audit: 'Audit Logs',
    settings: 'System Settings',
    notifications: 'Notifications'
};

function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

    const body = document.getElementById('pageBody');
    if (!body) return;
    body.innerHTML = loadingHtml();

    const renderers = {
        dashboard: renderDashboardPage,
        pos: renderPosPage,
        products: renderProductsPage,
        sales: renderSalesPage,
        expenses: renderExpensesPage,
        suppliers: renderSuppliersPage,
        customers: renderCustomersPage,
        reports: renderReportsPage,
        users: renderUsersPage,
        audit: renderAuditPage,
        settings: renderSettingsPage,
        notifications: renderNotificationsPage
    };

    const fn = renderers[page];
    if (fn) {
        fn(body).catch(err => {
            console.error(err);
            body.innerHTML = `<div class="card"><div class="card-body"><div class="empty-state"><div class="icon">⚠️</div><p>${escapeHtml(err.message || 'Failed to load page')}</p></div></div></div>`;
        });
    } else {
        body.innerHTML = `<div class="empty-state">Page not found</div>`;
    }

    // collapse mobile sidebar after navigation
    document.getElementById('sidebar')?.classList.remove('open');
}

async function handleLogout() {
    try { await Api.logout(); } catch { /* ignore */ }
    Store.clear();
    window.location.reload();
}

// ---- Boot ----

async function bootApp() {
    try {
        const res = await Api.me();
        Store.user = { ...Store.user, ...res.user, fullName: res.user.full_name, role: res.user.role, roleId: res.user.role_id };
        Store.permissions = res.permissions;
        try {
            const settingsRes = await Api.getSettings().catch(() => null);
            if (settingsRes?.settings?.currency) window.__shopCurrency = settingsRes.settings.currency;
        } catch { /* non-fatal */ }
        renderShell();
    } catch (err) {
        Store.clear();
        renderLogin();
    }
}

document.addEventListener('DOMContentLoaded', bootApp);
