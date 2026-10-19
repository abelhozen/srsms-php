<?php
/**
 * PUT /api/users/update.php?id=5
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requirePermission('users.manage');
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') jsonError('Method not allowed', 405);
requireCsrf();


$id = $_GET['id'] ?? null;
if (!$id) jsonError('Missing user id', 400);

$body = getJsonBody();
$fullName = bodyValue($body, 'fullName');
$email = bodyValue($body, 'email');
$phone = bodyValue($body, 'phone');
$roleId = bodyValue($body, 'roleId');
$status = bodyValue($body, 'status');

$targetStmt = $pdo->prepare(
    "SELECT u.id, u.role_id, u.status, r.name as role_name
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?"
);
$targetStmt->execute([$id]);
$target = $targetStmt->fetch();
if (!$target) jsonError('User not found', 404);

if ($user['role'] !== 'super_admin' && $target['role_name'] === 'super_admin') {
    jsonError('Only a Super Admin can modify a Super Admin account', 403);
}

if ($roleId !== null) {
    if (!filter_var($roleId, FILTER_VALIDATE_INT) || (int)$roleId < 1) {
        jsonError('A valid role is required', 400);
    }
    $roleCheck = $pdo->prepare("SELECT id, name FROM roles WHERE id = ?");
    $roleCheck->execute([(int)$roleId]);
    $selectedRole = $roleCheck->fetch();
    if (!$selectedRole) {
        jsonError('Selected role does not exist', 400);
    }
    if ($user['role'] !== 'super_admin' && $selectedRole['name'] === 'super_admin') {
        jsonError('Only a Super Admin can assign the Super Admin role', 403);
    }
    if ($user['role'] !== 'super_admin' && (int)$id === (int)$user['id'] && (int)$roleId !== (int)$target['role_id']) {
        jsonError('You cannot change your own role', 403);
    }
    $roleId = (int)$roleId;
}

// Do not allow changes that would leave the system without an active Super Admin.
$removingSuperAdmin = $target['role_name'] === 'super_admin'
    && (($roleId !== null && $roleId !== (int)$target['role_id'])
        || ($status !== null && $status !== 'active'));
if ($removingSuperAdmin && $target['status'] === 'active') {
    $countStmt = $pdo->query(
        "SELECT COUNT(*) as cnt FROM users u JOIN roles r ON r.id = u.role_id
         WHERE r.name = 'super_admin' AND u.status = 'active'"
    );
    if ((int)$countStmt->fetch()['cnt'] <= 1) {
        jsonError('Cannot modify the last active Super Admin account', 400);
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
