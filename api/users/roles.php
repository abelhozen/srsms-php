<?php
/**
 * GET /api/users/roles.php
 */
require_once __DIR__ . '/../../config/bootstrap.php';

requireAuth();
$pdo = getDB();

// Return only Admin (super_admin) and Owner roles so UI only exposes two roles
$stmt = $pdo->prepare("SELECT id, name, label, description FROM roles WHERE name IN ('super_admin','owner') ORDER BY id");
$stmt->execute();
jsonSuccess(['roles' => $stmt->fetchAll()]);
