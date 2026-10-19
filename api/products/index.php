<?php
/**
 * GET  /api/products/index.php?search=&categoryId=&status=  -> list products
 * POST /api/products/index.php                              -> create product
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'admin', 'owner', 'manager', 'store_keeper', 'cashier', 'accountant', 'auditor']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $search = $_GET['search'] ?? null;
    $categoryId = $_GET['categoryId'] ?? null;
    $status = $_GET['status'] ?? null;

    $sql = "
        SELECT p.id, p.product_code, p.name, p.unit, p.reorder_level, p.status, p.created_by,
               c.name AS category_name,
               COALESCE(SUM(b.quantity_remaining), 0) AS total_stock,
               MIN(b.expiry_date) AS nearest_expiry
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_batches b ON b.product_id = p.id AND b.status = 'active' AND b.quantity_remaining > 0
        WHERE 1=1
    ";
    $params = [];
    if ($search) { $sql .= " AND (p.name LIKE ? OR p.product_code LIKE ?)"; $params[] = "%$search%"; $params[] = "%$search%"; }
    if ($categoryId) { $sql .= " AND p.category_id = ?"; $params[] = $categoryId; }
    if ($status && $status !== 'all') {
        $sql .= " AND p.status = ?";
        $params[] = $status;
    } elseif (!$status) {
        $sql .= " AND p.status = 'active'";
    }
    $sql .= " GROUP BY p.id ORDER BY p.name ASC LIMIT 500";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonSuccess(['products' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRole(['super_admin', 'admin', 'owner']);
    $body = getJsonBody();
    requireFields($body, ['productCode', 'name']);

    $productCode = trim($body['productCode']);
    $name = trim($body['name']);
    $categoryId = bodyValue($body, 'categoryId');
    $unit = bodyValue($body, 'unit', 'pcs');
    $reorderLevel = bodyValue($body, 'reorderLevel', 10);

    $check = $pdo->prepare("SELECT id FROM products WHERE product_code = ?");
    $check->execute([$productCode]);
    if ($check->rowCount() > 0) jsonError('Product code already exists', 409);

    $stmt = $pdo->prepare(
        "INSERT INTO products (product_code, name, category_id, unit, reorder_level, created_by) VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$productCode, $name, $categoryId, $unit, $reorderLevel, $user['id']]);

    logAudit($user['id'], 'PRODUCT_CREATED', 'inventory', "Created product $name");
    jsonSuccess(['message' => 'Product created', 'productId' => $pdo->lastInsertId()], 201);
}

jsonError('Method not allowed', 405);
