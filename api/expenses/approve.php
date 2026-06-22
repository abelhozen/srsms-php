<?php
/**
 * PUT /api/expenses/approve.php?id=5
 * body: { decision: 'approved' | 'rejected' }
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['owner', 'accountant', 'super_admin']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') jsonError('Method not allowed', 405);

$id = $_GET['id'] ?? null;
if (!$id) jsonError('Missing expense id', 400);

$body = getJsonBody();
$decision = $body['decision'] ?? null;

if (!in_array($decision, ['approved', 'rejected'], true)) {
    jsonError('decision must be approved or rejected', 400);
}

$stmt = $pdo->prepare(
    "UPDATE expenses SET status = ?, approved_by = ? WHERE id = ? AND status = 'pending'"
);
$stmt->execute([$decision, $user['id'], $id]);

if ($stmt->rowCount() === 0) {
    jsonError('Expense not found or already processed', 400);
}

logAudit($user['id'], 'EXPENSE_' . strtoupper($decision), 'finance', "Expense #$id $decision");
jsonSuccess(['message' => "Expense $decision"]);
