<?php
/**
 * GET  /api/expenses/categories.php  -> list categories
 * POST /api/expenses/categories.php  -> create category
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['accountant', 'owner', 'manager', 'super_admin', 'auditor']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("SELECT * FROM expense_categories ORDER BY name");
    jsonSuccess(['categories' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRole(['accountant', 'owner', 'super_admin']);
    $body = getJsonBody();
    requireFields($body, ['name']);

    try {
        $stmt = $pdo->prepare("INSERT INTO expense_categories (name) VALUES (?)");
        $stmt->execute([trim($body['name'])]);
        jsonSuccess(['categoryId' => $pdo->lastInsertId()], 201);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') jsonError('Category already exists', 409);
        jsonError('Failed to create category', 500);
    }
}

jsonError('Method not allowed', 405);
