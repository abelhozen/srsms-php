<?php
/**
 * DELETE /api/expenses/clear-approved.php
 * body: { from?: "YYYY-MM-DD", to?: "YYYY-MM-DD" }
 *
 * Removes approved expenses from the system (finance records) for the selected period.
 * If from/to not provided, clears all approved expenses.
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['admin', 'owner', 'super_admin']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    jsonError('Method not allowed', 405);
}
requireCsrf();

$body = getJsonBody();
$from = bodyValue($body, 'from');
$to = bodyValue($body, 'to');

$where = "status = 'approved'";
$params = [];

if ($from) {
    $where .= " AND expense_date >= ?";
    $params[] = $from;
}
if ($to) {
    $where .= " AND expense_date <= ?";
    $params[] = $to;
}

// First fetch ids so we can give a stable deletedCount and keep logic clear.
$selectStmt = $pdo->prepare("SELECT id FROM expenses WHERE $where");
$selectStmt->execute($params);
$expenseIds = array_map('intval', array_column($selectStmt->fetchAll(), 'id'));

if (empty($expenseIds)) {
    jsonSuccess(['message' => 'No approved expenses found to clear', 'deletedCount' => 0]);
}

$placeholders = implode(',', array_fill(0, count($expenseIds), '?'));

try {
    $pdo->beginTransaction();

    $pdo->prepare("DELETE FROM expenses WHERE id IN ($placeholders)")
        ->execute($expenseIds);

    $pdo->commit();

    $period = ($from || $to)
        ? trim(($from ?: 'beginning') . ' to ' . ($to ?: 'now'))
        : 'all time';

    logAudit($user['id'], 'EXPENSES_CLEARED', 'finance', "Cleared " . count($expenseIds) . " approved expense(s) for $period");
    jsonSuccess(['message' => 'Approved expenses cleared', 'deletedCount' => count($expenseIds)]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Clear approved expenses error: ' . $e->getMessage());
    jsonError('Failed to clear approved expenses', 500);
}
