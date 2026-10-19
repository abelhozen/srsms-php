-- SRSMS performance indexes for faster dashboard, POS search, reports, and audit logs.
-- Safe to run multiple times.

-- MySQL doesn't support IF NOT EXISTS for indexes consistently,
-- so we guard with information_schema checks.

SET @db := 'srsms';

-- products
SET @idx := 'idx_products_status_name';
SET @cnt := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = @db AND index_name = @idx);
SET @sql := IF(@cnt = 0,
    'ALTER TABLE products ADD INDEX idx_products_status_name (status, name);',
    'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- product_batches
SET @idx := 'idx_batches_active_fifo';
SET @cnt := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = @db AND index_name = @idx);
SET @sql := IF(@cnt = 0,
    'ALTER TABLE product_batches ADD INDEX idx_batches_active_fifo (product_id, status, quantity_remaining, received_date, id);',
    'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := 'idx_batches_status_expiry';
SET @cnt := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = @db AND index_name = @idx);
SET @sql := IF(@cnt = 0,
    'ALTER TABLE product_batches ADD INDEX idx_batches_status_expiry (status, expiry_date, quantity_remaining);',
    'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sales
SET @idx := 'idx_sales_status_created';
SET @cnt := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = @db AND index_name = @idx);
SET @sql := IF(@cnt = 0,
    'ALTER TABLE sales ADD INDEX idx_sales_status_created (status, created_at);',
    'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sales_items
SET @idx := 'idx_sales_items_product_sale';
SET @cnt := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = @db AND index_name = @idx);
SET @sql := IF(@cnt = 0,
    'ALTER TABLE sales_items ADD INDEX idx_sales_items_product_sale (product_id, sale_id);',
    'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payments
SET @idx := 'idx_payments_sale_paid';
SET @cnt := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = @db AND index_name = @idx);
SET @sql := IF(@cnt = 0,
    'ALTER TABLE payments ADD INDEX idx_payments_sale_paid (sale_id, paid_at);',
    'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- expenses
SET @idx := 'idx_expenses_status_date';
SET @cnt := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = @db AND index_name = @idx);
SET @sql := IF(@cnt = 0,
    'ALTER TABLE expenses ADD INDEX idx_expenses_status_date (status, expense_date);',
    'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inventory_logs
SET @idx := 'idx_inv_log_type_ref';
SET @cnt := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = @db AND index_name = @idx);
SET @sql := IF(@cnt = 0,
    'ALTER TABLE inventory_logs ADD INDEX idx_inv_log_type_ref (change_type, reference_id);',
    'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- audit_logs
SET @idx := 'idx_audit_action_date';
SET @cnt := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = @db AND index_name = @idx);
SET @sql := IF(@cnt = 0,
    'ALTER TABLE audit_logs ADD INDEX idx_audit_action_date (action, created_at);',
    'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- notifications
SET @idx := 'idx_notifications_role_read_date';
SET @cnt := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = @db AND index_name = @idx);
SET @sql := IF(@cnt = 0,
    'ALTER TABLE notifications ADD INDEX idx_notifications_role_read_date (target_role_id, is_read, created_at);',
    'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

