<?php
/**
 * GET /api/sales/get.php?id=10
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['cashier', 'manager', 'super_admin', 'owner', 'accountant', 'auditor']);
$pdo = getDB();

$id = $_GET['id'] ?? null;
if (!$id) jsonError('Missing sale id', 400);

$stmt = $pdo->prepare(
    "SELECT s.*, u.full_name AS cashier_name, c.name AS customer_name, c.phone AS customer_phone
     FROM sales s JOIN users u ON u.id = s.cashier_id LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.id = ?"
);
$stmt->execute([$id]);
$sale = $stmt->fetch();

if (!$sale) jsonError('Sale not found', 404);

if ($user['role'] === 'cashier' && (int)$sale['cashier_id'] !== (int)$user['id']) {
    jsonError('You can only view your own sales', 403);
}

$itemStmt = $pdo->prepare(
    "SELECT si.*, p.name AS product_name, p.product_code, b.batch_number
     FROM sales_items si JOIN products p ON p.id = si.product_id
     JOIN product_batches b ON b.id = si.batch_id
     WHERE si.sale_id = ?"
);
$itemStmt->execute([$id]);
$items = $itemStmt->fetchAll();

if ($user['role'] === 'cashier') {
    unset($sale['profit_amount']);
    $items = array_map(function ($row) {
        unset($row['line_profit'], $row['unit_cost']);
        return $row;
    }, $items);
}

jsonSuccess(['sale' => $sale, 'items' => $items]);
