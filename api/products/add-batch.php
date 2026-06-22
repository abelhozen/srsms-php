<?php
/**
 * POST /api/products/add-batch.php?productId=5
 * body: { batchNumber, supplierId, quantity, buyingPrice, sellingPrice, expiryDate, receivedDate }
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'manager', 'store_keeper']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Method not allowed', 405);

$productId = $_GET['productId'] ?? null;
if (!$productId) jsonError('Missing productId', 400);

$body = getJsonBody();
requireFields($body, ['batchNumber', 'quantity', 'buyingPrice', 'sellingPrice']);

$batchNumber = trim($body['batchNumber']);
$supplierId = bodyValue($body, 'supplierId');
$quantity = (float)$body['quantity'];
$buyingPrice = (float)$body['buyingPrice'];
$sellingPrice = (float)$body['sellingPrice'];
$receivedDate = bodyValue($body, 'receivedDate');

// Expiry must be explicitly declared - either a real date, or an explicit
// "this product does not expire" flag. Silent omission is not allowed.
if (!array_key_exists('hasExpiry', $body)) {
    jsonError('You must specify whether this batch has an expiry date (hasExpiry: true/false)', 400);
}
$hasExpiry = filter_var($body['hasExpiry'], FILTER_VALIDATE_BOOLEAN);
$expiryDate = bodyValue($body, 'expiryDate');

if ($hasExpiry && !$expiryDate) {
    jsonError('Expiry date is required for this batch. If this product never expires, mark it as "No Expiry".', 400);
}
if ($hasExpiry && strtotime($expiryDate) <= strtotime($receivedDate ?: date('Y-m-d'))) {
    jsonError('Expiry date must be after the received date', 400);
}
if (!$hasExpiry) {
    $expiryDate = null; // explicit no-expiry products store NULL on purpose
}

if ($quantity <= 0) jsonError('Quantity must be greater than zero', 400);
if ($buyingPrice <= 0) jsonError('Buying price must be greater than zero', 400);
if ($sellingPrice <= 0) jsonError('Selling price must be greater than zero', 400);
if ($sellingPrice < $buyingPrice && !filter_var(bodyValue($body, 'confirmLowPrice', false), FILTER_VALIDATE_BOOLEAN)) {
    jsonError('Selling price is below buying price - this batch would sell at a loss. Resubmit with confirmLowPrice=true if this is intentional (e.g. clearance stock).', 400, ['warning' => 'price_below_cost']);
}

try {
    $pdo->beginTransaction();

    $check = $pdo->prepare("SELECT id FROM products WHERE id = ?");
    $check->execute([$productId]);
    if ($check->rowCount() === 0) {
        $pdo->rollBack();
        jsonError('Product not found', 404);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO product_batches
         (product_id, batch_number, supplier_id, quantity_received, quantity_remaining, buying_price, selling_price, expiry_date, received_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURDATE()), ?)"
    );
    $stmt->execute([$productId, $batchNumber, $supplierId, $quantity, $quantity, $buyingPrice, $sellingPrice, $expiryDate, $receivedDate, $user['id']]);
    $batchId = $pdo->lastInsertId();

    $logStmt = $pdo->prepare(
        "INSERT INTO inventory_logs (product_id, batch_id, change_type, quantity_change, quantity_after, note, created_by)
         VALUES (?, ?, 'stock_in', ?, ?, ?, ?)"
    );
    $logStmt->execute([$productId, $batchId, $quantity, $quantity, "New batch $batchNumber received", $user['id']]);

    $pdo->commit();
    logAudit($user['id'], 'BATCH_ADDED', 'inventory', "Added batch $batchNumber to product #$productId");

    jsonSuccess(['message' => 'Batch added successfully', 'batchId' => $batchId], 201);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Add batch error: ' . $e->getMessage());
    jsonError('Failed to add batch', 500);
}
