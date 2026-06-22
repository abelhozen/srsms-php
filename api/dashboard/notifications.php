<?php
/**
 * GET /api/dashboard/notifications.php
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireAuth();
$pdo = getDB();

$stmt = $pdo->prepare(
    "SELECT * FROM notifications
     WHERE target_role_id IS NULL OR target_role_id = ?
     ORDER BY created_at DESC LIMIT 50"
);
$stmt->execute([$user['roleId']]);
jsonSuccess(['notifications' => $stmt->fetchAll()]);
