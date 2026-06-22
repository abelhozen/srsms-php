<?php
/**
 * GET /api/settings/index.php  -> fetch settings
 * PUT /api/settings/index.php  -> update settings (Super Admin only)
 */
require_once __DIR__ . '/../../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    requireRole(['super_admin', 'owner']);
    $pdo = getDB();
    $stmt = $pdo->query("SELECT * FROM settings LIMIT 1");
    jsonSuccess(['settings' => $stmt->fetch() ?: null]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $user = requireRole(['super_admin']);
    $pdo = getDB();
    $body = getJsonBody();

    $shopName = bodyValue($body, 'shopName');
    $currency = bodyValue($body, 'currency');
    $taxRate = isset($body['taxRate']) ? (float)$body['taxRate'] : null;
    $address = bodyValue($body, 'address');
    $phone = bodyValue($body, 'phone');
    $lowStockThreshold = isset($body['lowStockThreshold']) ? (int)$body['lowStockThreshold'] : null;
    $expiryAlertDays = isset($body['expiryAlertDays']) ? (int)$body['expiryAlertDays'] : null;

    $existing = $pdo->query("SELECT id FROM settings LIMIT 1")->fetch();

    if (!$existing) {
        $stmt = $pdo->prepare(
            "INSERT INTO settings (shop_name, currency, tax_rate, address, phone, low_stock_threshold, expiry_alert_days)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $shopName ?: 'My Shop', $currency ?: 'TZS', $taxRate ?: 0, $address, $phone,
            $lowStockThreshold ?: 10, $expiryAlertDays ?: 30
        ]);
    } else {
        $stmt = $pdo->prepare(
            "UPDATE settings SET
                shop_name = COALESCE(?, shop_name), currency = COALESCE(?, currency),
                tax_rate = COALESCE(?, tax_rate), address = COALESCE(?, address), phone = COALESCE(?, phone),
                low_stock_threshold = COALESCE(?, low_stock_threshold), expiry_alert_days = COALESCE(?, expiry_alert_days)
             WHERE id = ?"
        );
        $stmt->execute([$shopName, $currency, $taxRate, $address, $phone, $lowStockThreshold, $expiryAlertDays, $existing['id']]);
    }

    logAudit($user['id'], 'SETTINGS_UPDATED', 'admin', 'System settings updated');
    jsonSuccess(['message' => 'Settings updated successfully']);
}

jsonError('Method not allowed', 405);
