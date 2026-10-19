/* ============================================================
   SRSMS API Client (PHP backend, session-cookie based auth)
   ============================================================ */

const API_BASE = 'api';
const API_CACHE_TTL_MS = 15000;
const API_CACHE = new Map();

function getApiCacheKey(method, endpoint) {
    return `${method.toUpperCase()} ${endpoint}`;
}

function readApiCache(method, endpoint) {
    const key = getApiCacheKey(method, endpoint);
    const cached = API_CACHE.get(key);
    if (!cached) return null;
    if (Date.now() - cached.time < API_CACHE_TTL_MS) return cached.data;
    API_CACHE.delete(key);
    return null;
}

function writeApiCache(method, endpoint, data) {
    API_CACHE.set(getApiCacheKey(method, endpoint), { time: Date.now(), data });
}

function clearApiCache() {
    API_CACHE.clear();
}

const Store = {
    get user() { try { return JSON.parse(sessionStorage.getItem('srsms_user')); } catch { return null; } },
    set user(v) { v ? sessionStorage.setItem('srsms_user', JSON.stringify(v)) : sessionStorage.removeItem('srsms_user'); },
    get permissions() { try { return JSON.parse(sessionStorage.getItem('srsms_permissions')) || []; } catch { return []; } },
    set permissions(v) { sessionStorage.setItem('srsms_permissions', JSON.stringify(v || [])); },
    clear() {
        sessionStorage.removeItem('srsms_user');
        sessionStorage.removeItem('srsms_permissions');
    }
};

async function apiRequest(method, endpoint, body) {
    const headers = { 'Content-Type': 'application/json' };
    const opts = { method, headers, credentials: 'include' }; // include = send PHP session cookie

    if (method === 'GET') {
        const cached = readApiCache(method, endpoint);
        if (cached) return cached;
    }

    // Request timeout: prevents long hangs and keeps perceived speed high.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5500);
    opts.signal = controller.signal;

    // CSRF token: expected to exist in sessionStorage (we fetch once after boot)
    const csrf = sessionStorage.getItem('srsms_csrf');
    if (csrf) headers['X-CSRF-Token'] = csrf;

    if (body !== undefined) opts.body = JSON.stringify(body);

    let res;
    try {
        res = await fetch(`${API_BASE}${endpoint}`, opts);
    } finally {
        clearTimeout(timeoutId);
    }


    if (res.status === 401) {
        Store.clear();
        if (!endpoint.includes('/auth/')) {
            window.location.reload();
        }
    }

    const data = await res.json().catch(() => ({ success: false, message: 'Invalid server response' }));
    if (!res.ok) {
        const err = new Error(data.message || `Request failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        throw err;
    }

    if (method === 'GET') {
        writeApiCache(method, endpoint, data);
    } else {
        clearApiCache();
    }

    return data;
}

// Downloads a binary/CSV report using the active session cookie
async function apiDownload(endpoint, filename) {
    const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Download failed' }));
        throw new Error(data.message || 'Download failed');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}

// Opens a print-ready PDF-style report in a new tab (uses session cookie automatically)
function openPdfReport(endpoint) {
    window.open(`${API_BASE}${endpoint}`, '_blank');
}

const Api = {
    // Auth
    login: (username, password) => apiRequest('POST', '/auth/login.php', { username, password }),
    logout: () => apiRequest('POST', '/auth/logout.php'),
    me: () => apiRequest('GET', '/auth/me.php'),

    // Users
    listUsers: () => apiRequest('GET', '/users/index.php'),
    updateRolePermissions: (roleId, permissionIds) => apiRequest('PUT', '/users/roles.php', { roleId, permissionIds }),
    getProfile: () => apiRequest('GET', '/users/profile.php'),
    updateProfile: (payload) => apiRequest('PUT', '/users/profile.php', payload),
    listRoles: () => apiRequest('GET', '/users/roles.php'),
    createUser: (payload) => apiRequest('POST', '/users/index.php', payload),
    updateUser: (id, payload) => apiRequest('PUT', `/users/update.php?id=${id}`, payload),
    resetPassword: (id, newPassword) => apiRequest('PUT', `/users/reset-password.php?id=${id}`, { newPassword }),
    deleteUser: (id) => apiRequest('DELETE', `/users/delete.php?id=${id}`),

    // Products & Inventory
    listProducts: (params = '') => apiRequest('GET', `/products/index.php${params}`),
    searchProducts: (q) => apiRequest('GET', `/products/search.php?q=${encodeURIComponent(q)}`),
    getProduct: (id) => apiRequest('GET', `/products/get.php?id=${id}`),
    createProduct: (payload) => apiRequest('POST', '/products/index.php', payload),
    updateProduct: (id, payload) => apiRequest('PUT', `/products/get.php?id=${id}`, payload),
    deleteProduct: (id) => apiRequest('DELETE', `/products/get.php?id=${id}`),
    addBatch: (productId, payload) => apiRequest('POST', `/products/add-batch.php?productId=${productId}`, payload),
    updateBatchStatus: (batchId, status, note) => apiRequest('PUT', `/products/batch-status.php?batchId=${batchId}`, { status, note }),
    updateProductSellers: (productId, payload) => apiRequest('PUT', `/products/sellers.php?productId=${productId}`, payload),
    lowStockAlerts: () => apiRequest('GET', '/products/alerts.php?type=low-stock'),
    expiringAlerts: () => apiRequest('GET', '/products/alerts.php?type=expiring'),

    // Sales / POS
    createSale: (payload) => apiRequest('POST', '/sales/create.php', payload),
    listSales: (params = '') => apiRequest('GET', `/sales/list.php${params}`),
    getSale: (id) => apiRequest('GET', `/sales/get.php?id=${id}`),
    voidSale: (id) => apiRequest('PUT', `/sales/void.php?id=${id}`),
    clearSalesHistory: (payload) => apiRequest('DELETE', '/sales/clear-history.php', payload),
    dailyRegister: (date) => apiRequest('GET', `/sales/daily-register.php${date ? `?date=${date}` : ''}`),

    // Expenses
    listExpenses: (params = '') => apiRequest('GET', `/expenses/index.php${params}`),
    listExpenseCategories: () => apiRequest('GET', '/expenses/categories.php'),
    createExpenseCategory: (name) => apiRequest('POST', '/expenses/categories.php', { name }),
    createExpense: (payload) => apiRequest('POST', '/expenses/index.php', payload),
    approveExpense: (id, decision) => apiRequest('PUT', `/expenses/approve.php?id=${id}`, { decision }),

    // Dashboard
    dashboardSummary: () => apiRequest('GET', '/dashboard/summary.php'),
    dashboardHealth: () => apiRequest('GET', '/dashboard/health.php'),
    salesTrend: (days = 30) => apiRequest('GET', `/dashboard/sales-trend.php?days=${days}`),
    topProducts: (limit = 10) => apiRequest('GET', `/dashboard/top-products.php?limit=${limit}`),
    notifications: () => apiRequest('GET', '/dashboard/notifications.php'),

    // Suppliers / Customers / Categories
    listSuppliers: () => apiRequest('GET', '/partners/suppliers.php'),
    createSupplier: (payload) => apiRequest('POST', '/partners/suppliers.php', payload),
    listCustomers: (params = '') => apiRequest('GET', `/partners/customers.php${params}`),
    createCustomer: (payload) => apiRequest('POST', '/partners/customers.php', payload),
    listCategories: () => apiRequest('GET', '/partners/categories.php'),
    createCategory: (payload) => apiRequest('POST', '/partners/categories.php', payload),

    // Settings & Audit
    getSettings: () => apiRequest('GET', '/settings/index.php'),
    updateSettings: (payload) => apiRequest('PUT', '/settings/index.php', payload),
    systemHealth: () => apiRequest('GET', '/settings/system-health.php'),
    listAuditLogs: (params = '') => apiRequest('GET', `/settings/audit-logs.php${params}`),

    // Backups
    listBackups: (limit = 20) => apiRequest('GET', `/settings/backup.php?limit=${limit}`),
    createBackup: () => apiRequest('POST', '/settings/backup.php', { action: 'create' }),
    downloadBackup: (filename) => apiDownload(`/settings/backup_download.php?file=${encodeURIComponent(filename)}`, filename),

    // Reports - PDF opens a print-ready tab; Excel downloads a .xls file

    openSalesPdf: (from, to) => openPdfReport(`/reports/sales-pdf.php?from=${from}&to=${to}`),
    downloadSalesExcel: (from, to) => apiDownload(`/reports/sales-excel.php?from=${from}&to=${to}`, `sales-report-${from}_${to}.xls`),
    openPnlPdf: (from, to) => openPdfReport(`/reports/profit-loss-pdf.php?from=${from}&to=${to}`),
    downloadPnlExcel: (from, to) => apiDownload(`/reports/profit-loss-excel.php?from=${from}&to=${to}`, `profit-loss-${from}_${to}.xls`),
    openInventoryPdf: () => openPdfReport('/reports/inventory-pdf.php'),
    downloadInventoryExcel: () => apiDownload('/reports/inventory-excel.php', 'inventory-report.xls'),
};
