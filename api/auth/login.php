<?php
/**
 * POST /api/auth/login.php
 * body: { username, password }
 */
require_once __DIR__ . '/../../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Method not allowed', 405);

$body = getJsonBody();
requireFields($body, ['username', 'password']);

$username = trim($body['username']);
$password = $body['password'];

$pdo = getDB();
$stmt = $pdo->prepare(
    "SELECT u.*, r.name AS role_name, r.label AS role_label
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.username = ? OR u.email = ?"
);
$stmt->execute([$username, $username]);
$user = $stmt->fetch();

if (!$user) {
    logAudit(null, 'LOGIN_FAILED', 'auth', "Unknown username: $username");
    jsonError('Invalid credentials', 401);
}

// Lockout check
if (!empty($user['locked_until']) && strtotime($user['locked_until']) > time()) {
    $minsLeft = ceil((strtotime($user['locked_until']) - time()) / 60);
    jsonError("Account locked due to multiple failed attempts. Try again in {$minsLeft} minute(s).", 423);
}

if ($user['status'] !== 'active') {
    jsonError('Account is not active. Contact your administrator.', 403);
}

if (!password_verify($password, $user['password_hash'])) {
    $attempts = (int)$user['failed_login_attempts'] + 1;
    $lockedUntil = null;
    if ($attempts >= LOGIN_MAX_ATTEMPTS) {
        $lockedUntil = date('Y-m-d H:i:s', time() + LOGIN_LOCK_MINUTES * 60);
    }
    $upd = $pdo->prepare("UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?");
    $upd->execute([$attempts, $lockedUntil, $user['id']]);
    logAudit($user['id'], 'LOGIN_FAILED', 'auth', 'Wrong password');

    if ($lockedUntil) {
        jsonError('Too many failed attempts. Account locked for ' . LOGIN_LOCK_MINUTES . ' minutes.', 423);
    }
    jsonError('Invalid credentials', 401);
}

// Success
$pdo->prepare("UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?")
    ->execute([$user['id']]);

session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];
$_SESSION['username'] = $user['username'];
$_SESSION['full_name'] = $user['full_name'];
$_SESSION['role'] = $user['role_name'];
$_SESSION['role_id'] = $user['role_id'];
$_SESSION['role_label'] = $user['role_label'];

logAudit($user['id'], 'LOGIN_SUCCESS', 'auth', 'User logged in');

jsonSuccess([
    'user' => [
        'id' => $user['id'],
        'fullName' => $user['full_name'],
        'username' => $user['username'],
        'email' => $user['email'],
        'role' => $user['role_name'],
        'roleLabel' => $user['role_label'],
        'roleId' => $user['role_id'],
    ]
]);
