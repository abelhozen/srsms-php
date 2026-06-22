<?php
/**
 * GET /api/sales/list.php?from=&to=&cashierId=&status=&limit=
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['cashier', 'manager', 'super_admin', 'owner', 'accountant', 'auditor']);
$pdo = getDB();

$from = $_GET['from'] ?? null;
$to = $_GET['to'] ?? null;
$cashierId = $_GET['cashierId'] ?? null;
$status = $_GET['status'] ?? null;
$limit = (int)($_GET['limit'] ?? 200);

$sql = "
    SELECT s.id, s.sale_number, s.subtotal, s.discount_amount, s.tax_amount, s.total_amount,
           s.profit_amount, s.payment_method, s.status, s.created_at,
           u.full_name AS cashier_name, c.name AS customer_name
    FROM sales s
    JOIN users u ON u.id = s.cashier_id
    LEFT JOIN customers c ON c.id = s.customer_id
    WHERE 1=1
";
$params = [];

if ($user['role'] === 'cashier') {
    $sql .= " AND s.cashier_id = ?";
    $params[] = $user['id'];
} elseif ($cashierId) {
    $sql .= " AND s.cashier_id = ?";
    $params[] = $cashierId;
}

if ($from) { $sql .= " AND s.created_at >= ?"; $params[] = $from; }
if ($to) { $sql .= " AND s.created_at <= ?"; $params[] = $to; }
if ($status) { $sql .= " AND s.status = ?"; $params[] = $status; }

$sql .= " ORDER BY s.created_at DESC LIMIT " . $limit;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$sales = $stmt->fetchAll();

// Cashiers should not see profit figures
if ($user['role'] === 'cashier') {
    $sales = array_map(function ($row) {
        unset($row['profit_amount']);
        return $row;
    }, $sales);
}

jsonSuccess(['sales' => $sales]);
