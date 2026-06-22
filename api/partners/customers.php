<?php
/**
 * GET  /api/partners/customers.php?search=  -> list customers
 * POST /api/partners/customers.php          -> create customer
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'owner', 'manager', 'store_keeper', 'cashier', 'accountant', 'auditor']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $search = $_GET['search'] ?? null;
    $sql = "SELECT * FROM customers";
    $params = [];
    if ($search) {
        $sql .= " WHERE name LIKE ? OR phone LIKE ?";
        $params[] = "%$search%"; $params[] = "%$search%";
    }
    $sql .= " ORDER BY name LIMIT 200";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonSuccess(['customers' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRole(['super_admin', 'manager', 'cashier']);
    $body = getJsonBody();
    requireFields($body, ['name']);

    $stmt = $pdo->prepare(
        "INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([
        trim($body['name']), bodyValue($body, 'phone'), bodyValue($body, 'email'), bodyValue($body, 'address')
    ]);
    jsonSuccess(['customerId' => $pdo->lastInsertId()], 201);
}

jsonError('Method not allowed', 405);
