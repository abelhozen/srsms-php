<?php
/**
 * Download a backup file (Admin only)
 * GET /api/settings/backup_download.php?file=... 
 */

require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'admin', 'owner']);
$pdo = getDB();

$fn = $_GET['file'] ?? null;
$fn = is_string($fn) ? basename($fn) : '';
if (!$fn) jsonError('Missing file', 400);

$backupDir = dirname(__DIR__, 2) . '/backups';
$full = $backupDir . '/' . $fn;
if (!is_file($full)) jsonError('File not found', 404);

// Ensure file exists in DB tracking (prevents arbitrary download even if filesystem has files)
$chk = $pdo->prepare("SELECT id FROM backup_files WHERE filename = ? LIMIT 1");
$chk->execute([$fn]);
if (!$chk->fetch()) jsonError('File not registered', 403);

logAudit($user['id'], 'BACKUP_DOWNLOADED', 'backup', $fn);

header('Content-Type: application/gzip');
header('Content-Disposition: attachment; filename="' . $fn . '"');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, private');

readfile($full);
exit;

