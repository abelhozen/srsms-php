<?php
/**
 * PUT /api/users/reset-password.php?id=5
 * body: { newPassword }
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'manager']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') jsonError('Method not allowed', 405);

$id = $_GET['id'] ?? null;
if (!$id) jsonError('Missing user id', 400);

$body = getJsonBody();
$newPassword = $body['newPassword'] ?? '';

if (strlen($newPassword) < 6) {
    jsonError('New password must be at least 6 characters', 400);
}

$hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
$stmt = $pdo->prepare(
    "UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?"
);
$stmt->execute([$hash, $id]);

logAudit($user['id'], 'PASSWORD_RESET', 'users', "Reset password for user #$id");
jsonSuccess(['message' => 'Password reset successfully']);
