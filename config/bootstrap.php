<?php
/**
 * SRSMS - Bootstrap
 * Starts session, sets headers, loads DB. Include this at the top of every API file.
 */

define('SRSMS_BOOTSTRAPPED', true);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('session.use_strict_mode', '1');

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
header('X-XSS-Protection: 1; mode=block');
if (!empty($isHttps)) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}
header("Content-Security-Policy: default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://fonts.googleapis.com 'unsafe-inline'; style-src 'self' https://cdnjs.cloudflare.com https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'");

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

// ---- CSRF helpers (for session-cookie based auth) ----

/**
 * Provide a CSRF token for the frontend to send with every state-changing request.
 * Token is session-bound.
 */
function csrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function requireCsrf() {
    // Allow safe methods.
    $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (in_array($m, ['GET','HEAD','OPTIONS'], true)) return;

    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $csrf = null;

    // Prefer header
    if (is_array($headers)) {
        foreach ($headers as $k => $v) {
            if (strtolower($k) === 'x-csrf-token') { $csrf = $v; break; }
        }
    }

    // Also allow body field for compatibility
    if ($csrf === null) {
        $body = getJsonBody();
        if (is_array($body) && array_key_exists('csrfToken', $body)) {
            $csrf = $body['csrfToken'];
        }
    }

    if (!$csrf || empty($_SESSION['csrf_token']) || !hash_equals((string)$_SESSION['csrf_token'], (string)$csrf)) {
        jsonError('CSRF validation failed', 419);
    }
}

// ---- Rate limiting helpers (login hardening) ----

function rateLimitHit($key, $limit, $windowSeconds) {
    $now = time();
    if (!isset($_SESSION['rl'][$key])) {
        $_SESSION['rl'][$key] = ['count' => 0, 'reset_at' => $now + $windowSeconds];
    }

    $bucket = $_SESSION['rl'][$key];
    if ($now >= (int)$bucket['reset_at']) {
        $bucket = ['count' => 0, 'reset_at' => $now + $windowSeconds];
    }

    $bucket['count']++;
    $_SESSION['rl'][$key] = $bucket;

    return $bucket['count'] <= $limit;
}

