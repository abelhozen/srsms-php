<?php
/**
 * POST /api/auth/logout.php
 */
require_once __DIR__ . '/../../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Method not allowed', 405);

$user = currentUser();
if ($user) {
    logAudit($user['id'], 'LOGOUT', 'auth', 'User logged out');
}

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();

jsonSuccess(['message' => 'Logged out successfully']);
