<?php
/**
 * GET /api/products/alerts.php?type=low-stock|expiring
 */
require_once __DIR__ . '/../../config/bootstrap.php';

requireRole(['super_admin', 'owner', 'manager', 'store_keeper', 'cashier', 'accountant', 'auditor']);
$pdo = getDB();

$type = $_GET['type'] ?? 'low-stock';

if ($type === 'low-stock') {
    $stmt = $pdo->query("
        SELECT p.id, p.product_code, p.name, p.reorder_level,
               COALESCE(SUM(b.quantity_remaining), 0) AS total_stock
        FROM products p
        LEFT JOIN product_batches b ON b.product_id = p.id AND b.status = 'active'
        WHERE p.status = 'active'
        GROUP BY p.id
        HAVING total_stock <= p.reorder_level
        ORDER BY total_stock ASC
        LIMIT 100
    ");
    jsonSuccess(['lowStock' => $stmt->fetchAll()]);
}

if ($type === 'expiring') {
    $settingsStmt = $pdo->query("SELECT expiry_alert_days FROM settings LIMIT 1");
    $settings = $settingsStmt->fetch();
    $days = $settings['expiry_alert_days'] ?? 30;

    $stmt = $pdo->prepare("
        SELECT b.id AS batch_id, b.batch_number, b.expiry_date, b.quantity_remaining,
               p.id AS product_id, p.name AS product_name
        FROM product_batches b
        JOIN products p ON p.id = b.product_id
        WHERE b.status = 'active' AND b.quantity_remaining > 0
          AND b.expiry_date IS NOT NULL
          AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY b.expiry_date ASC
        LIMIT 100
    ");
    $stmt->execute([$days]);
    jsonSuccess(['expiringSoon' => $stmt->fetchAll()]);
}

jsonError('Invalid alert type', 400);
