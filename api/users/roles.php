<?php
/**
 * GET /api/users/roles.php
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requirePermission('users.manage');
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    requireCsrf();
    $body = getJsonBody();
    requireFields($body, ['roleId', 'permissionIds']);

    $roleId = $body['roleId'];
    $permissionIds = $body['permissionIds'];
    if (!filter_var($roleId, FILTER_VALIDATE_INT) || (int)$roleId < 1 || !is_array($permissionIds)) {
        jsonError('A valid role and permission list are required', 400);
    }

    $roleStmt = $pdo->prepare("SELECT name FROM roles WHERE id = ?");
    $roleStmt->execute([(int)$roleId]);
    $role = $roleStmt->fetch();
    if (!$role) jsonError('Role not found', 404);
    if ($role['name'] === 'super_admin') {
        jsonError('The Super Admin role permissions cannot be changed here', 403);
    }

    $uniquePermissionIds = [];
    foreach ($permissionIds as $permissionId) {
        if (!filter_var($permissionId, FILTER_VALIDATE_INT) || (int)$permissionId < 1) {
            jsonError('Invalid permission selected', 400);
        }
        $uniquePermissionIds[(int)$permissionId] = (int)$permissionId;
    }
    $uniquePermissionIds = array_values($uniquePermissionIds);

    if ($user['role'] !== 'super_admin' && (int)$roleId === (int)$user['roleId']) {
        $managePermissionStmt = $pdo->query("SELECT id FROM permissions WHERE code = 'users.manage'");
        $managePermissionId = $managePermissionStmt->fetchColumn();
        if (!$managePermissionId || !in_array((int)$managePermissionId, $uniquePermissionIds, true)) {
            jsonError('You cannot remove your own user management permission', 400);
        }
    }

    if ($uniquePermissionIds) {
        $placeholders = implode(',', array_fill(0, count($uniquePermissionIds), '?'));
        $validPermissionsStmt = $pdo->prepare("SELECT id FROM permissions WHERE id IN ($placeholders)");
        $validPermissionsStmt->execute($uniquePermissionIds);
        if (count($validPermissionsStmt->fetchAll()) !== count($uniquePermissionIds)) {
            jsonError('One or more selected permissions do not exist', 400);
        }
    }

    try {
        $pdo->beginTransaction();
        $pdo->prepare("DELETE FROM role_permissions WHERE role_id = ?")->execute([(int)$roleId]);
        $insertPermission = $pdo->prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
        foreach ($uniquePermissionIds as $permissionId) {
            $insertPermission->execute([(int)$roleId, $permissionId]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('Role permissions update failed: ' . $e->getMessage());
        jsonError('Failed to update role permissions', 500);
    }

    logAudit($user['id'], 'ROLE_PERMISSIONS_UPDATED', 'users', "Updated permissions for role #$roleId");
    jsonSuccess(['message' => 'Role permissions updated successfully']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonError('Method not allowed', 405);

$roleFilter = $user['role'] === 'super_admin' ? '' : " WHERE name <> 'super_admin'";
$rolesStmt = $pdo->query("SELECT id, name, label, description FROM roles{$roleFilter} ORDER BY id");
$roles = $rolesStmt->fetchAll();
$permissionsStmt = $pdo->query(
    "SELECT rp.role_id, p.id, p.code, p.label, p.module
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     ORDER BY p.module, p.label"
);
$permissionsByRole = [];
foreach ($permissionsStmt->fetchAll() as $permission) {
    $permissionsByRole[$permission['role_id']][] = [
        'id' => $permission['id'],
        'code' => $permission['code'],
        'label' => $permission['label'],
        'module' => $permission['module'],
    ];
}
foreach ($roles as &$role) {
    $role['permissions'] = $permissionsByRole[$role['id']] ?? [];
}
unset($role);

$permissionCatalogStmt = $pdo->query("SELECT id, code, label, module FROM permissions ORDER BY module, label");
jsonSuccess(['roles' => $roles, 'permissions' => $permissionCatalogStmt->fetchAll()]);
