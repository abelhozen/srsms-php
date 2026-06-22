<?php
/**
 * PUT /api/products/batch-status.php?batchId=10
 * body: { status, note }
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'manager', 'store_keeper']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') jsonError('Method not allowed', 405);

$batchId = $_GET['batchId'] ?? null;
if (!$batchId) jsonError('Missing batchId', 400);

$body = getJsonBody();
$status = $body['status'] ?? null;
$note = bodyValue($body, 'note');

if (!in_array($status, ['damaged', 'expired', 'active', 'depleted'], true)) {
    jsonError('Invalid status', 400);
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT * FROM product_batches WHERE id = ?");
    $stmt->execute([$batchId]);
    $batch = $stmt->fetch();
    if (!$batch) {
        $pdo->rollBack();
        jsonError('Batch not found', 404);
    }

    $pdo->prepare("UPDATE product_batches SET status = ? WHERE id = ?")->execute([$status, $batchId]);

    if ($status === 'damaged' || $status === 'expired') {
        $pdo->prepare("UPDATE product_batches SET quantity_remaining = 0 WHERE id = ?")->execute([$batchId]);

        // inventory_logs.change_type ENUM uses 'damage'/'expiry', not 'damaged'/'expired'
        $changeType = $status === 'damaged' ? 'damage' : 'expiry';

        $logStmt = $pdo->prepare(
            "INSERT INTO inventory_logs (product_id, batch_id, change_type, quantity_change, quantity_after, note, created_by)
             VALUES (?, ?, ?, ?, 0, ?, ?)"
        );
        $logStmt->execute([
            $batch['product_id'], $batchId, $changeType, -$batch['quantity_remaining'],
            $note ?: "Marked as $status", $user['id']
        ]);
    }

    $pdo->commit();
    logAudit($user['id'], 'BATCH_STATUS_UPDATED', 'inventory', "Batch #$batchId set to $status");
    jsonSuccess(['message' => 'Batch status updated']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Batch status error: ' . $e->getMessage());
    jsonError('Failed to update batch status', 500);
}
