<?php
/**
 * DELETE /api/sales/clear-history.php
 * body: { from?: "YYYY-MM-DD", to?: "YYYY-MM-DD" }
 *
 * Removes sales records for the selected period from history/reports.
 * Stock is not restored; use void sale before clearing if stock should be reversed.
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'admin', 'owner']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    jsonError('Method not allowed', 405);
}

$body = getJsonBody();
$from = bodyValue($body, 'from');
$to = bodyValue($body, 'to');

$where = "1=1";
$params = [];
if ($from) {
    $where .= " AND created_at >= ?";
    $params[] = $from;
}
if ($to) {
    $where .= " AND created_at <= ?";
    $params[] = $to;
}

$selectStmt = $pdo->prepare("SELECT id FROM sales WHERE $where");
$selectStmt->execute($params);
$saleIds = array_map('intval', array_column($selectStmt->fetchAll(), 'id'));

if (empty($saleIds)) {
    jsonSuccess(['message' => 'No sales found to clear', 'deletedCount' => 0]);
}

$placeholders = implode(',', array_fill(0, count($saleIds), '?'));

try {
    $pdo->beginTransaction();

    $pdo->prepare("DELETE FROM inventory_logs WHERE change_type = 'sale' AND reference_id IN ($placeholders)")
        ->execute($saleIds);
    $pdo->prepare("DELETE FROM sales WHERE id IN ($placeholders)")
        ->execute($saleIds);

    $pdo->commit();

    $period = ($from || $to) ? trim(($from ?: 'beginning') . ' to ' . ($to ?: 'now')) : 'all time';
    logAudit($user['id'], 'SALES_HISTORY_CLEARED', 'sales', "Cleared " . count($saleIds) . " sale(s) for $period");
    jsonSuccess(['message' => 'Sales history cleared', 'deletedCount' => count($saleIds)]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Clear sales history error: ' . $e->getMessage());
    jsonError('Failed to clear sales history', 500);
}
