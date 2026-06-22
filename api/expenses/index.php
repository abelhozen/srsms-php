<?php
/**
 * GET  /api/expenses/index.php?from=&to=&status=&categoryId=  -> list expenses
 * POST /api/expenses/index.php                                 -> create expense
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['accountant', 'owner', 'manager', 'super_admin', 'auditor']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;
    $status = $_GET['status'] ?? null;
    $categoryId = $_GET['categoryId'] ?? null;

    $sql = "
        SELECT e.id, e.description, e.amount, e.expense_date, e.status,
               ec.name AS category_name, u.full_name AS created_by_name,
               a.full_name AS approved_by_name, e.created_at
        FROM expenses e
        LEFT JOIN expense_categories ec ON ec.id = e.category_id
        JOIN users u ON u.id = e.created_by
        LEFT JOIN users a ON a.id = e.approved_by
        WHERE 1=1
    ";
    $params = [];
    if ($from) { $sql .= " AND e.expense_date >= ?"; $params[] = $from; }
    if ($to) { $sql .= " AND e.expense_date <= ?"; $params[] = $to; }
    if ($status) { $sql .= " AND e.status = ?"; $params[] = $status; }
    if ($categoryId) { $sql .= " AND e.category_id = ?"; $params[] = $categoryId; }
    $sql .= " ORDER BY e.expense_date DESC LIMIT 500";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonSuccess(['expenses' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRole(['accountant', 'owner', 'super_admin']);
    $body = getJsonBody();
    requireFields($body, ['description', 'amount', 'expenseDate']);

    $categoryId = bodyValue($body, 'categoryId');
    $description = trim($body['description']);
    $amount = (float)$body['amount'];
    $expenseDate = $body['expenseDate'];

    $stmt = $pdo->prepare(
        "INSERT INTO expenses (category_id, description, amount, expense_date, created_by) VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([$categoryId, $description, $amount, $expenseDate, $user['id']]);

    logAudit($user['id'], 'EXPENSE_CREATED', 'finance', "Expense: $description ($amount)");
    jsonSuccess(['message' => 'Expense recorded, pending approval', 'expenseId' => $pdo->lastInsertId()], 201);
}

jsonError('Method not allowed', 405);
