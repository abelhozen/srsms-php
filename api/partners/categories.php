<?php
/**
 * GET  /api/partners/categories.php  -> list categories
 * POST /api/partners/categories.php  -> create category
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'owner', 'manager', 'store_keeper', 'cashier', 'accountant', 'auditor']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("SELECT * FROM categories ORDER BY name");
    jsonSuccess(['categories' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRole(['super_admin', 'manager', 'store_keeper']);
    $body = getJsonBody();
    requireFields($body, ['name']);

    try {
        $stmt = $pdo->prepare("INSERT INTO categories (name, description) VALUES (?, ?)");
        $stmt->execute([trim($body['name']), bodyValue($body, 'description')]);
        jsonSuccess(['categoryId' => $pdo->lastInsertId()], 201);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') jsonError('Category already exists', 409);
        jsonError('Failed to create category', 500);
    }
}

jsonError('Method not allowed', 405);
