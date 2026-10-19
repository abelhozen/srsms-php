<?php
/**
 * GET /api/settings/index.php  -> fetch settings
 * PUT /api/settings/index.php  -> update settings (Super Admin/Admin/Owner)
 */
require_once __DIR__ . '/../../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    requireRole(['super_admin', 'admin', 'owner']);
    $pdo = getDB();

    // Ensure column exists for backward compatibility
    try { $pdo->exec("ALTER TABLE settings ADD COLUMN backup_retention_period ENUM('day','week','month','year') NOT NULL DEFAULT 'week'"); } catch (Exception $e) { /* ignore */ }

    $stmt = $pdo->query("SELECT * FROM settings LIMIT 1");
    jsonSuccess(['settings' => $stmt->fetch() ?: null]);
}


if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    requireCsrf();
    $user = requireRole(['super_admin', 'admin', 'owner']);

    $pdo = getDB();
    $body = getJsonBody();

    $shopName = bodyValue($body, 'shopName');
    $currency = strtoupper(substr(trim((string)bodyValue($body, 'currency', 'TZS')), 0, 10));
    $taxRate = isset($body['taxRate']) ? max(0, min(100, (float)$body['taxRate'])) : null;
    $address = bodyValue($body, 'address');
    $phone = bodyValue($body, 'phone');
    $lowStockThreshold = isset($body['lowStockThreshold']) ? max(0, (int)$body['lowStockThreshold']) : null;
    $expiryAlertDays = isset($body['expiryAlertDays']) ? max(1, min(3650, (int)$body['expiryAlertDays'])) : null;

    $backupRetentionPeriod = isset($body['backupRetentionPeriod']) ? strtolower((string)$body['backupRetentionPeriod']) : null;
    if (!in_array($backupRetentionPeriod, ['day','week','month','year'], true)) {
        $backupRetentionPeriod = null;
    }

    $existing = $pdo->query("SELECT id FROM settings LIMIT 1")->fetch();


    if (!$existing) {
        // Ensure backup_retention_period column exists (backward compatible)
        $pdo->exec("ALTER TABLE settings ADD COLUMN backup_retention_period ENUM('day','week','month','year') NOT NULL DEFAULT 'week'");

        $stmt = $pdo->prepare(
            "INSERT INTO settings (shop_name, currency, tax_rate, address, phone, low_stock_threshold, expiry_alert_days, backup_retention_period)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $shopName ?: 'My Shop', $currency ?: 'TZS', $taxRate ?: 0, $address, $phone,
            $lowStockThreshold ?: 10, $expiryAlertDays ?: 30,
            $backupRetentionPeriod ?: 'week'
        ]);

    } else {
        // Ensure backup_retention_period column exists (backward compatible)
        try { $pdo->exec("ALTER TABLE settings ADD COLUMN backup_retention_period ENUM('day','week','month','year') NOT NULL DEFAULT 'week'"); } catch (Exception $e) { /* ignore if exists */ }

        $stmt = $pdo->prepare(
            "UPDATE settings SET
                shop_name = COALESCE(?, shop_name), currency = COALESCE(?, currency),
                tax_rate = COALESCE(?, tax_rate), address = COALESCE(?, address), phone = COALESCE(?, phone),
                low_stock_threshold = COALESCE(?, low_stock_threshold), expiry_alert_days = COALESCE(?, expiry_alert_days),
                backup_retention_period = COALESCE(?, backup_retention_period)
             WHERE id = ?"
        );
        $stmt->execute([$shopName, $currency, $taxRate, $address, $phone, $lowStockThreshold, $expiryAlertDays, $backupRetentionPeriod, $existing['id']]);

    }

    logAudit($user['id'], 'SETTINGS_UPDATED', 'admin', 'System settings updated');
    jsonSuccess(['message' => 'Settings updated successfully']);
}

jsonError('Method not allowed', 405);

