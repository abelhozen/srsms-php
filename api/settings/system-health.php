<?php
/**
 * GET /api/settings/system-health.php
 * Lightweight operational health summary for the Settings page.
 */
require_once __DIR__ . '/../../config/bootstrap.php';

requireRole(['super_admin', 'admin', 'owner']);
$pdo = getDB();

$start = microtime(true);

function scalarValue($pdo, $sql, $params = []) {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    if (!$row) return 0;
    $values = array_values($row);
    return $values[0] ?? 0;
}

$activeProducts = (int)scalarValue($pdo, "SELECT COUNT(*) FROM products WHERE status = 'active'");
$activeBatches = (int)scalarValue($pdo, "SELECT COUNT(*) FROM product_batches WHERE status = 'active' AND quantity_remaining > 0");
$todaySales = (int)scalarValue($pdo, "SELECT COUNT(*) FROM sales WHERE created_at >= CURDATE() AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)");
$pendingExpenses = (int)scalarValue($pdo, "SELECT COUNT(*) FROM expenses WHERE status = 'pending'");
$auditCount = (int)scalarValue($pdo, "SELECT COUNT(*) FROM audit_logs");
$lastAudit = scalarValue($pdo, "SELECT MAX(created_at) FROM audit_logs");

$lowStock = (int)scalarValue($pdo, "
    SELECT COUNT(*) FROM (
        SELECT p.id, p.reorder_level, COALESCE(SUM(b.quantity_remaining), 0) AS stock
        FROM products p
        LEFT JOIN product_batches b ON b.product_id = p.id AND b.status = 'active'
        WHERE p.status = 'active'
        GROUP BY p.id
        HAVING stock <= p.reorder_level
    ) x
");

$settingsUpdatedAt = scalarValue($pdo, "SELECT updated_at FROM settings ORDER BY id ASC LIMIT 1");
$dbLatencyMs = round((microtime(true) - $start) * 1000, 2);

jsonSuccess([
    'health' => [
        'activeProducts' => $activeProducts,
        'activeBatches' => $activeBatches,
        'todaySales' => $todaySales,
        'pendingExpenses' => $pendingExpenses,
        'lowStockProducts' => $lowStock,
        'auditRecords' => $auditCount,
        'lastAuditAt' => $lastAudit,
        'settingsUpdatedAt' => $settingsUpdatedAt,
        'dbLatencyMs' => $dbLatencyMs
    ]
]);
