<?php
/**
 * GET /api/auth/me.php
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireAuth();
$pdo = getDB();

$stmt = $pdo->prepare(
    "SELECT u.id, u.full_name, u.username, u.email, u.phone, r.name AS role, r.label AS role_label, r.id AS role_id
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?"
);
$stmt->execute([$user['id']]);
$row = $stmt->fetch();

if (!$row) jsonError('User not found', 404);

$permStmt = $pdo->prepare(
    "SELECT p.code FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ?"
);
$permStmt->execute([$row['role_id']]);
$permissions = array_column($permStmt->fetchAll(), 'code');

jsonSuccess(['user' => $row, 'permissions' => $permissions]);
