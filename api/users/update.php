<?php
/**
 * PUT /api/users/update.php?id=5
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'owner']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') jsonError('Method not allowed', 405);

$id = $_GET['id'] ?? null;
if (!$id) jsonError('Missing user id', 400);

$body = getJsonBody();
$fullName = bodyValue($body, 'fullName');
$email = bodyValue($body, 'email');
$phone = bodyValue($body, 'phone');
$roleId = bodyValue($body, 'roleId');
$status = bodyValue($body, 'status');

// Protect: cannot demote/disable the last remaining active super_admin
if ($status === 'disabled' || $status === 'suspended' || $roleId) {
    $stmt = $pdo->prepare(
        "SELECT u.id, r.name as role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?"
    );
    $stmt->execute([$id]);
    $target = $stmt->fetch();

    if ($target && $target['role_name'] === 'super_admin') {
        $countStmt = $pdo->query(
            "SELECT COUNT(*) as cnt FROM users u JOIN roles r ON r.id = u.role_id
             WHERE r.name = 'super_admin' AND u.status = 'active'"
        );
        if ($countStmt->fetch()['cnt'] <= 1) {
            jsonError('Cannot modify the last active Super Admin account', 400);
        }
    }
}

$stmt = $pdo->prepare(
    "UPDATE users SET
        full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        role_id = COALESCE(?, role_id),
        status = COALESCE(?, status)
     WHERE id = ?"
);
$stmt->execute([$fullName, $email, $phone, $roleId, $status, $id]);

logAudit($user['id'], 'USER_UPDATED', 'users', "Updated user #$id");
jsonSuccess(['message' => 'User updated successfully']);
