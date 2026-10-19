<?php
/**
 * GET /api/users/profile.php -> current user's profile
 * PUT /api/users/profile.php -> update current user's profile
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireAuth();
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare(
        "SELECT u.id, u.full_name, u.username, u.email, u.phone, u.status, u.last_login_at, u.created_at,
                r.name AS role_name, r.label AS role_label
         FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.id = ?"
    );
    $stmt->execute([$user['id']]);
    $profile = $stmt->fetch();
    if (!$profile) jsonError('Profile not found', 404);
    jsonSuccess(['profile' => $profile]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    requireCsrf();
    $body = getJsonBody();

    $fullName = bodyValue($body, 'fullName');
    $email = bodyValue($body, 'email');
    $phone = bodyValue($body, 'phone');
    $currentPassword = bodyValue($body, 'currentPassword');
    $newPassword = bodyValue($body, 'newPassword');

    $updates = [];
    $params = [];

    if ($fullName !== null) {
        $updates[] = 'full_name = ?';
        $params[] = trim($fullName);
    }
    if ($email !== null) {
        $updates[] = 'email = ?';
        $params[] = trim($email);
    }
    if ($phone !== null) {
        $updates[] = 'phone = ?';
        $params[] = trim($phone);
    }

    if ($newPassword !== null && $newPassword !== '') {
        if (strlen($newPassword) < 6) {
            jsonError('Password must be at least 6 characters', 400);
        }
        if ($currentPassword === null || $currentPassword === '') {
            jsonError('Current password is required to change your password', 400);
        }

        $check = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
        $check->execute([$user['id']]);
        $row = $check->fetch();
        if (!$row || !password_verify($currentPassword, $row['password_hash'])) {
            jsonError('Current password is incorrect', 401);
        }

        $updates[] = 'password_hash = ?';
        $params[] = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    if (empty($updates)) {
        jsonError('No changes provided', 400);
    }

    $params[] = $user['id'];
    $stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?');
    $stmt->execute($params);

    logAudit($user['id'], 'PROFILE_UPDATED', 'users', 'Updated profile');
    jsonSuccess(['message' => 'Profile updated successfully']);
}

jsonError('Method not allowed', 405);
