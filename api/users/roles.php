<?php
/**
 * GET /api/users/roles.php
 */
require_once __DIR__ . '/../../config/bootstrap.php';

requireRole(['super_admin', 'manager']);
$pdo = getDB();

$stmt = $pdo->query("SELECT id, name, label, description FROM roles ORDER BY id");
jsonSuccess(['roles' => $stmt->fetchAll()]);
