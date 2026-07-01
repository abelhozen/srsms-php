<?php
/**
 * GET  /api/users/index.php        -> list users
 * POST /api/users/index.php        -> create user
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'owner']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query(
        "SELECT u.id, u.full_name, u.username, u.email, u.phone, u.status, u.last_login_at, u.created_at,
                r.id AS role_id, r.name AS role_name, r.label AS role_label
         FROM users u JOIN roles r ON r.id = u.role_id
         ORDER BY u.created_at DESC"
    );
    jsonSuccess(['users' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = getJsonBody();
    requireFields($body, ['fullName', 'username', 'password', 'roleId']);

    $fullName = trim($body['fullName']);
    $username = trim($body['username']);
    $email = bodyValue($body, 'email');
    $phone = bodyValue($body, 'phone');
    $password = $body['password'];
    $roleId = $body['roleId'];

    if (strlen($password) < 6) {
        jsonError('Password must be at least 6 characters', 400);
    }

    $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $check->execute([$username]);
    if ($check->rowCount() > 0) {
        jsonError('Username already exists', 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt = $pdo->prepare(
        "INSERT INTO users (full_name, username, email, phone, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$fullName, $username, $email, $phone, $hash, $roleId]);

    logAudit($user['id'], 'USER_CREATED', 'users', "Created user $username");
    jsonSuccess(['message' => 'User created successfully', 'userId' => $pdo->lastInsertId()], 201);
}

jsonError('Method not allowed', 405);
