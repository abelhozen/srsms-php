<?php
/**
 * PUT /api/products/sellers.php?productId=5
 * body: { restrictSellers: true|false, sellerIds: [3, 5, 7] }
 *
 * Sets which users are allowed to sell this product. If restrictSellers
 * is false, any cashier may sell it (the normal/default case for most
 * shops). If true, only the listed sellerIds may sell it via POS.
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'manager', 'store_keeper']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') jsonError('Method not allowed', 405);

$productId = $_GET['productId'] ?? null;
if (!$productId) jsonError('Missing productId', 400);

$body = getJsonBody();
$restrictSellers = filter_var($body['restrictSellers'] ?? false, FILTER_VALIDATE_BOOLEAN);
$sellerIds = $body['sellerIds'] ?? [];

if (!is_array($sellerIds)) jsonError('sellerIds must be an array', 400);

try {
    $pdo->beginTransaction();

    $check = $pdo->prepare("SELECT id FROM products WHERE id = ?");
    $check->execute([$productId]);
    if ($check->rowCount() === 0) {
        $pdo->rollBack();
        jsonError('Product not found', 404);
    }

    $pdo->prepare("UPDATE products SET restrict_sellers = ? WHERE id = ?")
        ->execute([$restrictSellers ? 1 : 0, $productId]);

    // Replace the authorized seller list entirely with what was submitted
    $pdo->prepare("DELETE FROM product_authorized_sellers WHERE product_id = ?")->execute([$productId]);

    if ($restrictSellers && count($sellerIds) > 0) {
        $insertStmt = $pdo->prepare(
            "INSERT INTO product_authorized_sellers (product_id, user_id, assigned_by) VALUES (?, ?, ?)"
        );
        foreach (array_unique($sellerIds) as $sellerId) {
            $insertStmt->execute([$productId, (int)$sellerId, $user['id']]);
        }
    }

    $pdo->commit();
    logAudit($user['id'], 'PRODUCT_SELLERS_UPDATED', 'inventory',
        "Product #$productId seller restriction set to " . ($restrictSellers ? 'restricted' : 'open'));

    jsonSuccess(['message' => 'Authorized sellers updated successfully']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Update sellers error: ' . $e->getMessage());
    jsonError('Failed to update authorized sellers', 500);
}
