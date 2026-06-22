<?php
/**
 * GET /api/dashboard/sales-trend.php?days=30
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireAuth();
$pdo = getDB();

$days = (int)($_GET['days'] ?? 30);

$stmt = $pdo->prepare(
    "SELECT DATE(created_at) AS date,
            COALESCE(SUM(total_amount),0) AS revenue,
            COALESCE(SUM(profit_amount),0) AS profit
     FROM sales
     WHERE status='completed' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY date ASC"
);
$stmt->execute([$days]);
$trend = $stmt->fetchAll();

$isFinancial = in_array($user['role'], ['super_admin', 'owner', 'manager', 'accountant', 'auditor'], true);
if (!$isFinancial) {
    $trend = array_map(function ($row) {
        unset($row['profit']);
        return $row;
    }, $trend);
}

jsonSuccess(['trend' => $trend]);
