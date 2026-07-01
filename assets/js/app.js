/* ============================================================
   SRSMS App Shell
   Router + role-based sidebar + page mounting
   ============================================================ */

const ICONS = {
    dashboard: '<i class="fa-solid fa-chart-line" aria-hidden="true"></i>',
    pos: '<i class="fa-solid fa-cash-register" aria-hidden="true"></i>',
    products: '<i class="fa-solid fa-box-open" aria-hidden="true"></i>',
    sales: '<i class="fa-solid fa-receipt" aria-hidden="true"></i>',
    expenses: '<i class="fa-solid fa-file-invoice-dollar" aria-hidden="true"></i>',
    reports: '<i class="fa-solid fa-chart-simple" aria-hidden="true"></i>',
    users: '<i class="fa-solid fa-users" aria-hidden="true"></i>',
    profile: '<i class="fa-solid fa-circle-user" aria-hidden="true"></i>',
    settings: '<i class="fa-solid fa-gear" aria-hidden="true"></i>',
    audit: '<i class="fa-solid fa-clipboard-list" aria-hidden="true"></i>',
    suppliers: '<i class="fa-solid fa-truck" aria-hidden="true"></i>',
    customers: '<i class="fa-solid fa-user-group" aria-hidden="true"></i>',
    logout: '<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>',
    bell: '<i class="fa-solid fa-bell" aria-hidden="true"></i>'
};

const BASE_NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'pos', label: 'Point of Sale', icon: 'pos' },
    { key: 'products', label: 'Products & Stock', icon: 'products' },
    { key: 'sales', label: 'Sales History', icon: 'sales' },
    { key: 'expenses', label: 'Expenses', icon: 'expenses' },
    { key: 'suppliers', label: 'Suppliers', icon: 'suppliers' },
    { key: 'customers', label: 'Customers', icon: 'customers' },
    { key: 'reports', label: 'Reports', icon: 'reports' },
    { key: 'users', label: 'Users & Roles', icon: 'users' },
    { key: 'profile', label: 'My Profile', icon: 'profile' },
    { key: 'audit', label: 'Audit Logs', icon: 'audit' },
    { key: 'settings', label: 'System Settings', icon: 'settings' },
];

const NAV_CONFIG = {
    super_admin: BASE_NAV,
    admin: BASE_NAV,
    owner: BASE_NAV,
};

let currentPage = null;

function canAccessPage(role, page) {
    if (page === 'users' || page === 'settings') {
        return hasAnyRole(role, ['super_admin', 'admin', 'owner']);
    }
    if (page === 'audit') {
        return hasAnyRole(role, ['super_admin', 'admin', 'owner', 'auditor']);
    }
    return true;
}

function getVisibleNav(role) {
    return (NAV_CONFIG[role] || BASE_NAV).filter(item => canAccessPage(role, item.key));
}

function getDefaultPage(role) {
    const nav = getVisibleNav(role);
    return nav.length ? nav[0].key : 'dashboard';
}

function renderShell() {
    const user = Store.user;
    if (!user) return renderLogin();

    setCurrency(window.__shopCurrency || 'TZS');

    const nav = getVisibleNav(user.role);
    const navHtml = nav.map(item => `
        <div class="nav-item" data-page="${item.key}" onclick="navigateTo('${item.key}')">
            ${ICONS[item.icon] || ''}
            <span>${item.label}</span>
        </div>
    `).join('');

    document.getElementById('root').innerHTML = `
        <div class="app-shell">
            <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="toggleSidebar(false)"></div>
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-brand">
                    <div class="mark"><i class="fa-solid fa-store"></i></div>
                    <div>
                        <div class="name">SRSMS</div>
                        <div class="tagline">Gold Retail Suite</div>
                    </div>
                </div>
                <div class="sidebar-user">
                    <div class="uname">${escapeHtml(user.fullName)}</div>
                    <span class="urole">${escapeHtml(roleLabel(user.role))}</span>
                    <div class="role-pill">Owner & Admin Ready</div>
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
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button class="mobile-menu-btn" onclick="toggleSidebar(true)" aria-label="Open menu">
                            <i class="fa-solid fa-bars"></i>
                        </button>
                        <div>
                            <div class="topbar-kicker">Gold Retail Operations</div>
                            <h1 id="pageTitle">Dashboard</h1>
                        </div>
                    </div>
                    <div class="topbar-right">
                        <span class="page-pill"><i class="fa-solid fa-shield-halved"></i> Secure & Accurate</span>
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
    profile: 'My Profile',
    audit: 'Audit Logs',
    settings: 'System Settings',
    notifications: 'Notifications'
};

function navigateTo(page) {
    const role = Store.user?.role;
    if (!canAccessPage(role, page)) {
        const fallbackPage = getDefaultPage(role);
        if (fallbackPage !== page) {
            showError('You do not have access to that section.');
            navigateTo(fallbackPage);
            return;
        }
    }

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
        profile: renderProfilePage,
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
    toggleSidebar(false);
}

function toggleSidebar(forceOpen) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !sidebar?.classList.contains('open');
    sidebar?.classList.toggle('open', shouldOpen);
    backdrop?.classList.toggle('show', shouldOpen);
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
