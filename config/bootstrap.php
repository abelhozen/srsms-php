<?php
/**
 * SRSMS - Bootstrap
 * Starts session, sets headers, loads DB. Include this at the top of every API file.
 */

define('SRSMS_BOOTSTRAPPED', true);

if (session_status() === PHP_SESSION_NONE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    session_set_cookie_params([
        'lifetime' => 8 * 3600, // 8 hours
        'path' => '/',
        'httponly' => true,
        'secure' => $isHttps,
        'samesite' => 'Lax'
    ]);
    session_start();
}

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
header('Cache-Control: no-store, no-cache, must-revalidate, private');
header('Pragma: no-cache');

require_once __DIR__ . '/database.php';

// ---- JSON response helpers ----

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

function jsonSuccess($extra = [], $statusCode = 200) {
    jsonResponse(array_merge(['success' => true], $extra), $statusCode);
}

function jsonError($message, $statusCode = 400, $extra = []) {
    jsonResponse(array_merge(['success' => false, 'message' => $message], $extra), $statusCode);
}

function getJsonBody() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ---- Auth helpers ----

function currentUser() {
    if (empty($_SESSION['user_id'])) return null;
    return [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'fullName' => $_SESSION['full_name'],
        'role' => $_SESSION['role'],
        'roleId' => $_SESSION['role_id'],
        'roleLabel' => $_SESSION['role_label'],
    ];
}

function requireAuth() {
    $user = currentUser();
    if (!$user) {
        jsonError('Not authenticated. Please log in.', 401);
    }
    return $user;
}

/**
 * Restrict the current request to one or more role names.
 * Usage: requireRole(['super_admin', 'admin']);
 */
function requireRole($allowedRoles) {
    $user = requireAuth();
    if (!in_array($user['role'], $allowedRoles, true)) {
        jsonError('Access denied. This action requires role: ' . implode(' or ', $allowedRoles), 403);
    }
    return $user;
}

/**
 * Restrict the current request to users whose role holds a specific permission code.
 */
function requirePermission($permissionCode) {
    $user = requireAuth();
    $pdo = getDB();
    $stmt = $pdo->prepare(
        "SELECT rp.permission_id FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = ? AND p.code = ?"
    );
    $stmt->execute([$user['roleId'], $permissionCode]);
    if ($stmt->rowCount() === 0) {
        jsonError('Access denied. Missing permission: ' . $permissionCode, 403);
    }
    return $user;
}

// ---- Audit log ----

function logAudit($userId, $action, $module = null, $description = null) {
    try {
        $pdo = getDB();
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $stmt = $pdo->prepare(
            "INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([$userId, $action, $module, $description, $ip]);
    } catch (Exception $e) {
        error_log('Audit log failed: ' . $e->getMessage());
    }
}

// ---- Misc helpers ----

function bodyValue($body, $key, $default = null) {
    return isset($body[$key]) && $body[$key] !== '' ? $body[$key] : $default;
}

function requireFields($body, $fields) {
    $missing = [];
    foreach ($fields as $f) {
        if (!isset($body[$f]) || $body[$f] === '') $missing[] = $f;
    }
    if (!empty($missing)) {
        jsonError('Missing required field(s): ' . implode(', ', $missing), 400);
    }
}
