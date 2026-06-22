<?php
/**
 * GET  /api/partners/suppliers.php  -> list suppliers
 * POST /api/partners/suppliers.php  -> create supplier
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'owner', 'manager', 'store_keeper', 'accountant', 'auditor']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("SELECT * FROM suppliers ORDER BY name");
    jsonSuccess(['suppliers' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRole(['super_admin', 'manager', 'store_keeper']);
    $body = getJsonBody();
    requireFields($body, ['name']);

    $stmt = $pdo->prepare(
        "INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        trim($body['name']), bodyValue($body, 'contactPerson'), bodyValue($body, 'phone'),
        bodyValue($body, 'email'), bodyValue($body, 'address')
    ]);
    jsonSuccess(['supplierId' => $pdo->lastInsertId()], 201);
}

jsonError('Method not allowed', 405);
