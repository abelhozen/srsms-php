<?php
/**
 * DELETE /api/users/delete.php?id=5
 * Soft-deletes (disables) the user. Super Admin only.
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'owner']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') jsonError('Method not allowed', 405);

$id = $_GET['id'] ?? null;
if (!$id) jsonError('Missing user id', 400);

$stmt = $pdo->prepare(
    "SELECT u.id, r.name as role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?"
);
$stmt->execute([$id]);
$target = $stmt->fetch();

if (!$target) jsonError('User not found', 404);

if ($target['role_name'] === 'super_admin') {
    $countStmt = $pdo->query(
        "SELECT COUNT(*) as cnt FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'super_admin'"
    );
    if ($countStmt->fetch()['cnt'] <= 1) {
        jsonError('Cannot delete the last Super Admin account', 400);
    }
}

$pdo->prepare("UPDATE users SET status = 'disabled' WHERE id = ?")->execute([$id]);
logAudit($user['id'], 'USER_DISABLED', 'users', "Disabled user #$id");
jsonSuccess(['message' => 'User disabled successfully']);
