-- ============================================================
-- SRSMS - Smart Retail Shop Management System
-- Full Production MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS srsms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE srsms;

-- ============================================================
-- ROLES & PERMISSIONS
-- ============================================================

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,       -- super_admin, owner, manager, accountant, store_keeper, cashier, auditor
    label VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,      -- e.g. 'sales.create', 'reports.view_profit'
    label VARCHAR(150) NOT NULL,
    module VARCHAR(50) NOT NULL
);

CREATE TABLE role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(60) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    status ENUM('active','suspended','disabled') DEFAULT 'active',
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIME NULL,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked TINYINT(1) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- SETTINGS
-- ============================================================

CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(150) DEFAULT 'My Shop',
    currency VARCHAR(10) DEFAULT 'TZS',
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    address TEXT,
    phone VARCHAR(30),
    low_stock_threshold INT DEFAULT 10,
    expiry_alert_days INT DEFAULT 30,
    backup_retention_period ENUM('day','week','month','year') NOT NULL DEFAULT 'week',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE backup_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_period ENUM('day','week','month','year') NOT NULL,
    size_bytes BIGINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CATEGORIES & SUPPLIERS
-- ============================================================

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PRODUCTS & BATCH-BASED INVENTORY (NO BARCODE)
-- ============================================================

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category_id INT,
    unit VARCHAR(30) DEFAULT 'pcs',          -- pcs, kg, litre, box...
    reorder_level INT DEFAULT 10,
    status ENUM('active','inactive') DEFAULT 'active',
    restrict_sellers TINYINT(1) DEFAULT 0,   -- 0 = any cashier may sell it, 1 = only authorized sellers below
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_product_name (name)
);

-- Which cashiers/users are allowed to sell a given product, when
-- products.restrict_sellers = 1. Lets a shop say "only these staff
-- may sell prescription items / high-value goods / etc."
CREATE TABLE product_authorized_sellers (
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    assigned_by INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, user_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE TABLE product_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    batch_number VARCHAR(80) NOT NULL,
    supplier_id INT,
    quantity_received DECIMAL(12,2) NOT NULL,
    quantity_remaining DECIMAL(12,2) NOT NULL,
    buying_price DECIMAL(14,2) NOT NULL,
    selling_price DECIMAL(14,2) NOT NULL,
    expiry_date DATE NULL,
    received_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    status ENUM('active','expired','damaged','depleted') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_batch_product (product_id),
    INDEX idx_batch_expiry (expiry_date),
    INDEX idx_batch_received (received_date)
);

CREATE TABLE inventory_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    batch_id INT,
    change_type ENUM('stock_in','sale','adjustment','damage','expiry','return') NOT NULL,
    quantity_change DECIMAL(12,2) NOT NULL,   -- negative for out
    quantity_after DECIMAL(12,2) NOT NULL,
    reference_id INT,                          -- e.g. sale_id
    note VARCHAR(255),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (batch_id) REFERENCES product_batches(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_inv_log_product (product_id),
    INDEX idx_inv_log_date (created_at)
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SALES (POS)
-- ============================================================

CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_number VARCHAR(40) NOT NULL UNIQUE,
    customer_id INT NULL,
    cashier_id INT NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL,
    discount_amount DECIMAL(14,2) DEFAULT 0,
    tax_amount DECIMAL(14,2) DEFAULT 0,
    total_amount DECIMAL(14,2) NOT NULL,
    total_cost DECIMAL(14,2) NOT NULL DEFAULT 0,   -- COGS snapshot
    profit_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    payment_method ENUM('cash','mobile_money','card','credit') DEFAULT 'cash',
    payment_status ENUM('paid','partial','unpaid') DEFAULT 'paid',
    status ENUM('completed','voided','refunded') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    INDEX idx_sales_date (created_at),
    INDEX idx_sales_cashier (cashier_id)
);

CREATE TABLE sales_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    batch_id INT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(14,2) NOT NULL,
    unit_cost DECIMAL(14,2) NOT NULL,
    line_total DECIMAL(14,2) NOT NULL,
    line_profit DECIMAL(14,2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (batch_id) REFERENCES product_batches(id),
    INDEX idx_sale_items_sale (sale_id)
);

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    method ENUM('cash','mobile_money','card','credit') DEFAULT 'cash',
    received_by INT,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (received_by) REFERENCES users(id)
);

-- ============================================================
-- EXPENSES & ACCOUNTING
-- ============================================================

CREATE TABLE expense_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    expense_date DATE NOT NULL,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_by INT,
    approved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_expense_date (expense_date)
);

-- ============================================================
-- CACHES (Performance)
-- ============================================================

CREATE TABLE profit_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cache_date DATE NOT NULL UNIQUE,
    total_sales DECIMAL(14,2) DEFAULT 0,
    total_cost DECIMAL(14,2) DEFAULT 0,
    gross_profit DECIMAL(14,2) DEFAULT 0,
    total_expenses DECIMAL(14,2) DEFAULT 0,
    net_profit DECIMAL(14,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE dashboard_cache (
    cache_key VARCHAR(100) PRIMARY KEY,
    cache_value JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(60),
    description TEXT,
    ip_address VARCHAR(60),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_audit_date (created_at),
    INDEX idx_audit_user (user_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('low_stock','expired_batch','high_expense','profit_drop','suspicious_activity') NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    severity ENUM('info','warning','critical') DEFAULT 'info',
    is_read TINYINT(1) DEFAULT 0,
    target_role_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_role_id) REFERENCES roles(id)
);

-- ============================================================
-- SEED: ROLES
-- ============================================================

INSERT INTO roles (name, label, description) VALUES
('super_admin', 'Super Admin', 'System owner - full access to everything including system settings and user management'),
('owner', 'Owner', 'Business owner - views all business performance, profit/loss, and reports but does not run daily POS operations'),
('manager', 'Manager', 'Runs daily shop operations - products, inventory, purchases, sales oversight, and can sell at POS'),
('accountant', 'Accountant', 'Finance officer - expenses, profit & loss, cash flow, financial reports'),
('store_keeper', 'Store Keeper', 'Inventory officer - manages products, batches, expiry dates, and suppliers'),
('cashier', 'Cashier', 'Sales officer - records all sales at POS, prints receipts, registers customers'),
('auditor', 'Auditor', 'Read-only access for audit, compliance, and reviewing logs');

-- ============================================================
-- SEED: PERMISSIONS
-- ============================================================

INSERT INTO permissions (code, label, module) VALUES
('users.manage', 'Manage Users', 'admin'),
('settings.manage', 'Manage System Settings', 'admin'),
('backup.manage', 'Backup & Restore', 'admin'),
('roles.manage', 'Manage Roles & Permissions', 'admin'),
('settings.view', 'View System Settings', 'admin'),
('products.manage', 'Manage Products', 'inventory'),
('products.view', 'View Products', 'inventory'),
('batches.manage', 'Manage Batches', 'inventory'),
('inventory.view', 'View Inventory', 'inventory'),
('suppliers.manage', 'Manage Suppliers', 'inventory'),
('suppliers.view', 'View Suppliers', 'inventory'),
('purchases.manage', 'Manage Purchases (Stock-In)', 'inventory'),
('purchases.view', 'View Purchases', 'inventory'),
('sales.create', 'Create Sales (POS)', 'sales'),
('sales.void', 'Void/Refund Sales', 'sales'),
('sales.view_all', 'View All Sales', 'sales'),
('sales.view_own', 'View Own Sales Only', 'sales'),
('returns.approve', 'Approve Returns', 'sales'),
('customers.manage', 'Register & Manage Customers', 'sales'),
('expenses.manage', 'Manage Expenses', 'finance'),
('expenses.approve', 'Approve Expenses', 'finance'),
('expenses.view', 'View Expenses', 'finance'),
('reports.view_profit', 'View Profit & Loss Reports', 'reports'),
('reports.view_sales', 'View Sales Reports', 'reports'),
('reports.view_inventory', 'View Inventory Reports', 'reports'),
('reports.export', 'Export Reports (PDF/Excel)', 'reports'),
('dashboard.view_financial', 'View Financial Dashboard', 'dashboard'),
('dashboard.view_operational', 'View Operational Dashboard', 'dashboard'),
('dashboard.view_analytics', 'View Business Analytics', 'dashboard'),
('audit.view', 'View Audit Logs', 'audit');

-- ============================================================
-- SEED: ROLE-PERMISSION MAPPING
-- Mapping follows the agreed Permissions Matrix:
-- Module        | SuperAdmin | Owner | Manager | Accountant | StoreKeeper | Cashier | Auditor
-- Dashboard      |    ✅      |  ✅   |   ✅    |     ✅     |     ✅      |   ✅    |   ✅
-- Products       |    ✅      |  👁️  |   ✅    |     👁️     |     ✅      |   👁️   |   👁️
-- Inventory      |    ✅      |  👁️  |   ✅    |     👁️     |     ✅      |   ❌    |   👁️
-- Sales/POS      |    ✅      |  👁️  |   ✅    |     👁️     |     ❌      |   ✅    |   👁️
-- Purchases      |    ✅      |  👁️  |   ✅    |     👁️     |     ✅      |   ❌    |   👁️
-- Expenses       |    ✅      |  ✅   |   👁️    |     ✅     |     ❌      |   ❌    |   👁️
-- Profit & Loss  |    ✅      |  ✅   |   👁️    |     ✅     |     ❌      |   ❌    |   👁️
-- Reports        |    ✅      |  ✅   |   ✅    |     ✅     |     👁️      |   ❌    |   ✅
-- Users          |    ✅      |  ❌   |   ✅    |     ❌     |     ❌      |   ❌    |   ❌
-- Settings       |    ✅      |  👁️  |   ❌    |     ❌     |     ❌      |   ❌    |   ❌
-- ============================================================

-- Super Admin: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name='super_admin'), id FROM permissions;

-- Owner: sees everything about business performance, approves expenses,
-- but does not run daily POS/inventory operations (view-only on those).
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name='owner'), id FROM permissions
WHERE code IN ('products.view','inventory.view','suppliers.view','purchases.view',
'sales.view_all','expenses.manage','expenses.approve','expenses.view',
'reports.view_profit','reports.view_sales','reports.view_inventory','reports.export',
'dashboard.view_financial','dashboard.view_operational','dashboard.view_analytics','settings.view');

-- Manager: runs daily operations end-to-end, including selling at POS.
-- View-only on expenses/P&L (those belong to Owner/Accountant to manage).
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name='manager'), id FROM permissions
WHERE code IN ('products.manage','products.view','batches.manage','inventory.view',
'suppliers.manage','suppliers.view','purchases.manage','purchases.view',
'sales.create','sales.void','sales.view_all','returns.approve','customers.manage',
'expenses.view','reports.view_profit','reports.view_sales','reports.view_inventory',
'reports.export','dashboard.view_financial','dashboard.view_operational',
'dashboard.view_analytics','users.manage');

-- Accountant: owns the finance module end-to-end, view-only on stock.
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name='accountant'), id FROM permissions
WHERE code IN ('products.view','inventory.view','suppliers.view','purchases.view',
'sales.view_all','expenses.manage','expenses.approve','expenses.view',
'reports.view_profit','reports.view_sales','reports.view_inventory','reports.export',
'dashboard.view_financial','dashboard.view_operational');

-- Store Keeper: owns products/inventory/suppliers/purchases, cannot sell
-- and cannot see profit figures.
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name='store_keeper'), id FROM permissions
WHERE code IN ('products.manage','products.view','batches.manage','inventory.view',
'suppliers.manage','suppliers.view','purchases.manage','purchases.view',
'reports.view_inventory','dashboard.view_operational');

-- Cashier: POS only. Records every sale into the system (stock deducts
-- automatically), registers customers, cannot see profit or edit stock.
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name='cashier'), id FROM permissions
WHERE code IN ('products.view','sales.create','sales.view_own','customers.manage',
'dashboard.view_operational');

-- Auditor: read-only across almost everything, including audit trail.
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name='auditor'), id FROM permissions
WHERE code IN ('products.view','inventory.view','suppliers.view','purchases.view',
'sales.view_all','expenses.view','reports.view_profit','reports.view_sales',
'reports.view_inventory','reports.export','audit.view',
'dashboard.view_financial','dashboard.view_operational','dashboard.view_analytics');

-- ============================================================
-- SEED: DEFAULT SETTINGS
-- ============================================================

INSERT INTO settings (shop_name, currency, tax_rate, low_stock_threshold, expiry_alert_days)
VALUES ('My Retail Shop', 'TZS', 0.00, 10, 30);

-- ============================================================
-- SEED: DEFAULT USERS (login accounts ready out of the box)
-- ============================================================
-- Password hashes below are real bcrypt hashes (cost 12), verified to work.
-- Super Admin password: Admin@123
-- All other accounts password: Demo@123
-- ⚠️ Change these passwords (or delete these accounts) before using this
-- system for real business data.

INSERT INTO users (full_name, username, email, password_hash, role_id, status) VALUES
('System Administrator', 'superadmin', 'admin@srsms.local',
 '$2y$12$L/cjtXIWeML5umlTpQcYduMiBWl9D.TFhaNxvhmk01L5Bxx9k1rzC',
 (SELECT id FROM roles WHERE name = 'super_admin'), 'active'),

('Halima Juma', 'owner1', 'owner1@srsms.local',
 '$2y$12$pX7.GucCiU.lXry3a77aCeaTGU09K1YnGNJSuKn4ezeuaK/gK6xuK',
 (SELECT id FROM roles WHERE name = 'owner'), 'active'),

('Asha Mwakasege', 'manager1', 'manager1@srsms.local',
 '$2y$12$35e7I5hoIi8VfWzzMpY.uutvUv1AtC.fSFXtN6gC17NVQZ9RA5ody',
 (SELECT id FROM roles WHERE name = 'manager'), 'active'),

('Juma Hassani', 'cashier1', 'cashier1@srsms.local',
 '$2y$12$35e7I5hoIi8VfWzzMpY.uutvUv1AtC.fSFXtN6gC17NVQZ9RA5ody',
 (SELECT id FROM roles WHERE name = 'cashier'), 'active'),

('Neema Mushi', 'storekeeper1', 'storekeeper1@srsms.local',
 '$2y$12$35e7I5hoIi8VfWzzMpY.uutvUv1AtC.fSFXtN6gC17NVQZ9RA5ody',
 (SELECT id FROM roles WHERE name = 'store_keeper'), 'active'),

('Daudi Komba', 'accountant1', 'accountant1@srsms.local',
 '$2y$12$35e7I5hoIi8VfWzzMpY.uutvUv1AtC.fSFXtN6gC17NVQZ9RA5ody',
 (SELECT id FROM roles WHERE name = 'accountant'), 'active'),

('Zainab Said', 'auditor1', 'auditor1@srsms.local',
 '$2y$12$35e7I5hoIi8VfWzzMpY.uutvUv1AtC.fSFXtN6gC17NVQZ9RA5ody',
 (SELECT id FROM roles WHERE name = 'auditor'), 'active');

-- ============================================================
-- SEED: DEFAULT EXPENSE CATEGORIES
-- ============================================================

INSERT INTO expense_categories (name) VALUES
('Rent'), ('Utilities'), ('Salaries'), ('Transport'), ('Maintenance'), ('Marketing'), ('Miscellaneous');

-- ============================================================
-- SEED: DEFAULT PRODUCT CATEGORY
-- ============================================================

INSERT INTO categories (name, description) VALUES
('General', 'Default product category');
