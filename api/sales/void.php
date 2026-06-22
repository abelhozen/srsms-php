<?php
/**
 * PUT /api/sales/void.php?id=10
 * Reverses stock and marks the sale voided. Admin/Super Admin only.
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['manager', 'super_admin']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') jsonError('Method not allowed', 405);

$id = $_GET['id'] ?? null;
if (!$id) jsonError('Missing sale id', 400);

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT * FROM sales WHERE id = ?");
    $stmt->execute([$id]);
    $sale = $stmt->fetch();

    if (!$sale) { $pdo->rollBack(); jsonError('Sale not found', 404); }
    if ($sale['status'] === 'voided') { $pdo->rollBack(); jsonError('Sale already voided', 400); }

    $itemStmt = $pdo->prepare("SELECT * FROM sales_items WHERE sale_id = ?");
    $itemStmt->execute([$id]);
    $items = $itemStmt->fetchAll();

    foreach ($items as $item) {
        $pdo->prepare("UPDATE product_batches SET quantity_remaining = quantity_remaining + ?, status = 'active' WHERE id = ?")
            ->execute([$item['quantity'], $item['batch_id']]);

        $batchStmt = $pdo->prepare("SELECT quantity_remaining FROM product_batches WHERE id = ?");
        $batchStmt->execute([$item['batch_id']]);
        $newQty = $batchStmt->fetch()['quantity_remaining'];

        $pdo->prepare(
            "INSERT INTO inventory_logs (product_id, batch_id, change_type, quantity_change, quantity_after, reference_id, note, created_by)
             VALUES (?, ?, 'return', ?, ?, ?, 'Sale voided - stock restored', ?)"
        )->execute([$item['product_id'], $item['batch_id'], $item['quantity'], $newQty, $id, $user['id']]);
    }

    $pdo->prepare("UPDATE sales SET status = 'voided' WHERE id = ?")->execute([$id]);
    $pdo->commit();

    logAudit($user['id'], 'SALE_VOIDED', 'sales', "Voided sale #$id");
    jsonSuccess(['message' => 'Sale voided and stock restored']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Void sale error: ' . $e->getMessage());
    jsonError('Failed to void sale', 500);
}
