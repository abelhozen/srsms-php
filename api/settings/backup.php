<?php
/**
 * Backup & Restore (Admin only)
 *
 * Endpoints:
 *  - GET  /api/settings/backup.php?limit=20
 *  - POST /api/settings/backup.php  { action: 'create' }
 *
 * Backups are MySQL dumps stored as .sql.gz inside /backups/ (server-side directory).
 * Web access to /backups is blocked via backups/.htaccess.
 */

require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'admin', 'owner']);
$pdo = getDB();

// --- Ensure storage directory exists ---
$backupDir = dirname(__DIR__, 2) . '/backups';
if (!is_dir($backupDir)) {
    @mkdir($backupDir, 0777, true);
}

function ensureBackupDirectory($backupDir) {
    if (!is_dir($backupDir)) {
        @mkdir($backupDir, 0777, true);
    }

    if (!is_dir($backupDir)) {
        return false;
    }

    if (!is_writable($backupDir)) {
        @chmod($backupDir, 0777);
    }

    return is_writable($backupDir);
}

function findExecutable($name) {
    $candidates = [];
    $pathEntries = explode(PATH_SEPARATOR, getenv('PATH') ?: '');
    foreach ($pathEntries as $entry) {
        if ($entry !== '') {
            $candidates[] = rtrim($entry, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $name;
        }
    }
    $candidates[] = '/opt/lampp/bin/' . $name;
    $candidates[] = '/usr/bin/' . $name;
    $candidates[] = '/usr/local/bin/' . $name;
    $candidates[] = $name;

    foreach ($candidates as $candidate) {
        $candidate = trim((string)$candidate);
        if ($candidate === '') continue;

        if ($candidate === $name) {
            $resolved = trim((string)@shell_exec("command -v {$name} 2>/dev/null"));
            if ($resolved !== '') return $resolved;
            continue;
        }

        if (is_executable($candidate)) {
            return $candidate;
        }
    }

    return null;
}

function ensureBackupSchema($pdo) {
    // settings columns for retention (safe to run multiple times)
    $pdo->exec("ALTER TABLE settings ADD COLUMN backup_retention_period ENUM('day','week','month','year') NOT NULL DEFAULT 'week'" );
}

function ensureBackupTables($pdo) {
    // Create backup_files table if missing.
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS backup_files (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            retention_period ENUM('day','week','month','year') NOT NULL,
            size_bytes BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

// Helper: map retention_period to cutoff timestamp SQL-style in PHP
function retentionCutoffUnix($period) {
    $now = time();
    switch ($period) {
        case 'day':
            return $now - 86400;
        case 'week':
            return $now - 7 * 86400;
        case 'month':
            return $now - 30 * 86400;
        case 'year':
            return $now - 365 * 86400;
        default:
            return $now - 7 * 86400;
    }
}

function parseRetentionPeriod($p) {
    $p = strtolower(trim((string)$p));
    if (!in_array($p, ['day','week','month','year'], true)) return 'week';
    return $p;
}

function getRetentionFromSettings($pdo) {
    $row = $pdo->query("SELECT backup_retention_period FROM settings LIMIT 1")->fetch();
    if (!$row || empty($row['backup_retention_period'])) return 'week';
    return (string)$row['backup_retention_period'];
}

function cleanupOldBackups($pdo, $backupDir) {
    $stmt = $pdo->query("SELECT id, filename, retention_period, created_at FROM backup_files");
    $rows = $stmt->fetchAll();

    foreach ($rows as $row) {
        $period = parseRetentionPeriod($row['retention_period'] ?? '');
        $cutoff = retentionCutoffUnix($period);
        $cutoffStr = date('Y-m-d H:i:s', $cutoff);
        $createdAt = $row['created_at'] ?? null;

        if ($createdAt && strtotime((string)$createdAt) < strtotime($cutoffStr)) {
            $fn = $row['filename'] ?? null;
            if ($fn) {
                $full = $backupDir . '/' . $fn;
                if (is_file($full)) {
                    @unlink($full);
                }
            }

            $del = $pdo->prepare("DELETE FROM backup_files WHERE id = ?");
            $del->execute([(int)$row['id']]);
        }
    }
}

// Robust column/table ensure without requiring manual schema update.
// MySQL may fail ALTER if column exists, so we check information_schema.
function ensureColumnIfMissing($pdo, $table, $column, $ddlFragment) {
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?"
    );
    $stmt->execute([$table, $column]);
    $cnt = (int)$stmt->fetch()['cnt'];
    if ($cnt === 0) {
        $pdo->exec("ALTER TABLE {$table} ADD COLUMN {$ddlFragment}");
    }
}

ensureColumnIfMissing(
    $pdo,
    'settings',
    'backup_retention_period',
    "backup_retention_period ENUM('day','week','month','year') NOT NULL DEFAULT 'week'"
);
ensureBackupTables($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $limit = max(1, min(50, (int)($_GET['limit'] ?? 20)));
    $period = getRetentionFromSettings($pdo);

    cleanupOldBackups($pdo, $backupDir);

    $stmt = $pdo->prepare(
        "SELECT id, filename, created_at, retention_period, size_bytes
         FROM backup_files
         ORDER BY created_at DESC
         LIMIT ?"
    );
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();

    logAudit($user['id'], 'BACKUP_LISTED', 'backup', "limit={$limit}");
    jsonSuccess([
        'retentionPeriod' => $period,
        'backups' => $stmt->fetchAll()
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $body = getJsonBody();

    $action = strtolower(trim((string)($body['action'] ?? '')));
    if ($action !== 'create') {
        jsonError('Invalid action', 400);
    }

    if (!ensureBackupDirectory($backupDir)) {
        jsonError('Backup directory is not writable', 500);
    }

    $dumpBin = findExecutable('mysqldump');
    $gzipBin = findExecutable('gzip');
    if (!$dumpBin || !$gzipBin) {
        jsonError('mysqldump or gzip not found on server PATH', 500);
    }

    // Ensure single backup isn’t created concurrently by multiple admins (best-effort lock)
    $lockFile = $backupDir . '/.backup.lock';
    $fh = @fopen($lockFile, 'c');
    if ($fh) {
        @flock($fh, LOCK_EX | LOCK_NB);
    }

    $dbName = DB_NAME;
    $dbHost = DB_HOST;
    $dbPort = defined('DB_PORT') ? DB_PORT : '3306';
    $dbUser = DB_USER;
    $dbPass = DB_PASS;

    $timestamp = date('Ymd-His');
    $filename = "srsms-backup-{$timestamp}.sql.gz";
    $fullPath = $backupDir . '/' . $filename;

    // Build mysqldump command and gzip it.
    // Use --single-transaction to avoid locking tables.
    // Password passed to avoid interactive prompt.
    $escapedPass = addslashes((string)$dbPass);

    // Avoid exposing password in logs: we do not log the command.
    $cmd = sprintf(
        "%s -h %s -P %s -u %s %s --single-transaction --skip-lock-tables --routines --events | %s -c > %s",
        escapeshellarg($dumpBin),
        escapeshellarg($dbHost),
        escapeshellarg((string)$dbPort),
        escapeshellarg($dbUser),
        escapeshellarg($dbName),
        escapeshellarg($gzipBin),
        escapeshellarg($fullPath)
    );

    // If DB_PASS is not empty, set MYSQL_PWD env for this command.
    $prefix = '';
    if (!empty($dbPass)) {
        $prefix = 'MYSQL_PWD=' . escapeshellarg((string)$dbPass) . ' ';
    }

    $start = microtime(true);
    $ok = null;
    @exec($prefix . $cmd . ' 2>&1', $output, $code);
    $ok = ($code === 0);

    $durationMs = (int)round((microtime(true) - $start) * 1000);

    if (!$ok || !is_file($fullPath)) {
        if ($fh) @flock($fh, LOCK_UN);
        if ($fh) @fclose($fh);
        @unlink($fullPath);
        logAudit($user['id'], 'BACKUP_FAILED', 'backup', 'mysqldump failed');
        jsonError('Backup failed. Check server mysqldump permissions.', 500, [
            'details' => implode("\n", array_slice($output, 0, 10)),
            'durationMs' => $durationMs
        ]);
    }

    $sizeBytes = filesize($fullPath) ?: 0;
    $period = getRetentionFromSettings($pdo);

    $ins = $pdo->prepare(
        "INSERT INTO backup_files (filename, retention_period, size_bytes) VALUES (?, ?, ?)"
    );
    $ins->execute([$filename, $period, $sizeBytes]);

    // Cleanup old backups according to each backup's retention policy
    cleanupOldBackups($pdo, $backupDir);

    if ($fh) {
        @flock($fh, LOCK_UN);
        @fclose($fh);
    }

    logAudit($user['id'], 'BACKUP_CREATED', 'backup', "{$filename} ({$sizeBytes} bytes) in {$durationMs}ms");

    jsonSuccess([
        'message' => 'Backup created successfully',
        'backup' => [
            'filename' => $filename,
            'created_at' => date('Y-m-d H:i:s'),
            'size_bytes' => $sizeBytes
        ]
    ]);
}

jsonError('Method not allowed', 405);

