<?php
/**
 * GET /api/products/get.php?id=5      -> product + its batches
 * PUT /api/products/get.php?id=5      -> update product
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'admin', 'owner', 'manager', 'store_keeper', 'cashier', 'accountant', 'auditor']);
$pdo = getDB();

$id = $_GET['id'] ?? null;
if (!$id) jsonError('Missing product id', 400);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare(
        "SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?"
    );
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    if (!$product) jsonError('Product not found', 404);

    $batchStmt = $pdo->prepare(
        "SELECT b.*, s.name AS supplier_name FROM product_batches b
         LEFT JOIN suppliers s ON s.id = b.supplier_id
         WHERE b.product_id = ? ORDER BY b.received_date DESC"
    );
    $batchStmt->execute([$id]);

    $sellerStmt = $pdo->prepare(
        "SELECT u.id, u.full_name, u.username FROM product_authorized_sellers pas
         JOIN users u ON u.id = pas.user_id WHERE pas.product_id = ? ORDER BY u.full_name"
    );
    $sellerStmt->execute([$id]);

    jsonSuccess([
        'product' => $product,
        'batches' => $batchStmt->fetchAll(),
        'authorizedSellers' => $sellerStmt->fetchAll()
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $user = requireRole(['super_admin', 'admin', 'owner', 'manager', 'store_keeper', 'cashier', 'accountant', 'auditor']);
    $stmt = $pdo->prepare("SELECT created_by FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $productOwner = $stmt->fetch();
    $canManage = in_array($user['role'], ['super_admin', 'admin', 'owner']) || ($productOwner && (int)$productOwner['created_by'] === (int)$user['id']);
    if (!$canManage) {
        jsonError('You are not allowed to edit this product', 403);
    }

    $body = getJsonBody();
    $name = bodyValue($body, 'name');
    $categoryId = bodyValue($body, 'categoryId');
    $unit = bodyValue($body, 'unit');
    $reorderLevel = bodyValue($body, 'reorderLevel');
    $status = bodyValue($body, 'status');
    $restrictSellers = array_key_exists('restrictSellers', $body)
        ? (filter_var($body['restrictSellers'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0)
        : null;

    $stmt = $pdo->prepare(
        "UPDATE products SET
            name = COALESCE(?, name), category_id = COALESCE(?, category_id),
            unit = COALESCE(?, unit), reorder_level = COALESCE(?, reorder_level), status = COALESCE(?, status),
            restrict_sellers = COALESCE(?, restrict_sellers)
         WHERE id = ?"
    );
    $stmt->execute([$name, $categoryId, $unit, $reorderLevel, $status, $restrictSellers, $id]);

    logAudit($user['id'], 'PRODUCT_UPDATED', 'inventory', "Updated product #$id");
    jsonSuccess(['message' => 'Product updated']);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    requireCsrf();
    $user = requireRole(['super_admin', 'admin', 'owner']);


    $stmt = $pdo->prepare("SELECT id, name, status FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    if (!$product) jsonError('Product not found', 404);

    try {
        $pdo->beginTransaction();

        $batchStmt = $pdo->prepare(
            "SELECT id, quantity_remaining FROM product_batches
             WHERE product_id = ? AND status = 'active' AND quantity_remaining > 0"
        );
        $batchStmt->execute([$id]);
        $activeBatches = $batchStmt->fetchAll();

        $pdo->prepare("UPDATE products SET status = 'inactive' WHERE id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM product_authorized_sellers WHERE product_id = ?")->execute([$id]);

        $logStmt = $pdo->prepare(
            "INSERT INTO inventory_logs (product_id, batch_id, change_type, quantity_change, quantity_after, note, created_by)
             VALUES (?, ?, 'adjustment', ?, 0, ?, ?)"
        );
        foreach ($activeBatches as $batch) {
            $qty = (float)$batch['quantity_remaining'];
            if ($qty > 0) {
                $logStmt->execute([$id, $batch['id'], -$qty, 'Product deleted - remaining stock hidden', $user['id']]);
            }
        }

        $pdo->prepare(
            "UPDATE product_batches
             SET quantity_remaining = 0, status = 'depleted'
             WHERE product_id = ? AND status = 'active'"
        )->execute([$id]);

        $pdo->commit();
        logAudit($user['id'], 'PRODUCT_DELETED', 'inventory', "Deleted product #$id ({$product['name']}) - hidden and stock cleared");
        jsonSuccess(['message' => 'Product deleted and hidden from stock/POS']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('Product delete error: ' . $e->getMessage());
        jsonError('Failed to delete product', 500);
    }

}


jsonError('Method not allowed', 405);
