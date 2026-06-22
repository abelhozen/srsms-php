<?php
/**
 * GET /api/settings/audit-logs.php?from=&to=&userId=&action=&limit=
 */
require_once __DIR__ . '/../../config/bootstrap.php';

requireRole(['super_admin', 'auditor']);
$pdo = getDB();

$from = $_GET['from'] ?? null;
$to = $_GET['to'] ?? null;
$userId = $_GET['userId'] ?? null;
$action = $_GET['action'] ?? null;
$limit = (int)($_GET['limit'] ?? 300);

$sql = "
    SELECT al.id, al.action, al.module, al.description, al.ip_address, al.created_at,
           u.full_name AS user_name, u.username
    FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
    WHERE 1=1
";
$params = [];
if ($from) { $sql .= " AND al.created_at >= ?"; $params[] = $from; }
if ($to) { $sql .= " AND al.created_at <= ?"; $params[] = $to; }
if ($userId) { $sql .= " AND al.user_id = ?"; $params[] = $userId; }
if ($action) { $sql .= " AND al.action LIKE ?"; $params[] = "%$action%"; }
$sql .= " ORDER BY al.created_at DESC LIMIT " . $limit;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
jsonSuccess(['logs' => $stmt->fetchAll()]);
