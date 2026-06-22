<?php
/**
 * POST /api/sales/create.php
 * body: { items: [{ productId, quantity }], customerId, discountAmount, paymentMethod }
 *
 * Uses FIFO: oldest active batch (by received_date) is consumed first.
 * The entire sale is one PDO transaction - if stock is insufficient for
 * any item, everything rolls back so partial sales never get recorded.
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['cashier', 'manager', 'super_admin']);
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Method not allowed', 405);

$body = getJsonBody();
$items = $body['items'] ?? [];
$customerId = bodyValue($body, 'customerId');
$discountAmount = (float)($body['discountAmount'] ?? 0);
$paymentMethod = bodyValue($body, 'paymentMethod', 'cash');

if (!is_array($items) || count($items) === 0) {
    jsonError('Sale must contain at least one item', 400);
}

function generateSaleNumber() {
    $ts = strtoupper(base_convert((string)round(microtime(true) * 1000), 10, 36));
    $rand = strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
    return "SALE-$ts-$rand";
}

try {
    $pdo->beginTransaction();

    $taxStmt = $pdo->query("SELECT tax_rate FROM settings LIMIT 1");
    $taxRow = $taxStmt->fetch();
    $taxRate = (float)($taxRow['tax_rate'] ?? 0);

    $subtotal = 0;
    $totalCost = 0;
    $saleItemsToInsert = [];
    $inventoryLogsToInsert = [];

    foreach ($items as $item) {
        $productId = $item['productId'] ?? null;
        $qtyNeeded = (float)($item['quantity'] ?? 0);

        if (!$productId || $qtyNeeded <= 0) {
            throw new Exception('Each item requires a valid productId and quantity > 0', 400);
        }

        // Enforce seller restriction: if this product is restricted and the
        // current user isn't Super Admin/Admin, they must be on the
        // authorized seller list - even if they bypassed the UI and called
        // the API directly with a productId they found elsewhere.
        if (!in_array($user['role'], ['super_admin', 'manager'], true)) {
            $restrictStmt = $pdo->prepare("SELECT name, restrict_sellers FROM products WHERE id = ?");
            $restrictStmt->execute([$productId]);
            $productRow = $restrictStmt->fetch();

            if ($productRow && (int)$productRow['restrict_sellers'] === 1) {
                $authStmt = $pdo->prepare(
                    "SELECT 1 FROM product_authorized_sellers WHERE product_id = ? AND user_id = ?"
                );
                $authStmt->execute([$productId, $user['id']]);
                if ($authStmt->rowCount() === 0) {
                    throw new Exception("You are not authorized to sell \"{$productRow['name']}\". Ask your manager for access.", 403);
                }
            }
        }

        // Lock active batches for this product, oldest first (FIFO)
        $batchStmt = $pdo->prepare(
            "SELECT * FROM product_batches
             WHERE product_id = ? AND status = 'active' AND quantity_remaining > 0
             ORDER BY received_date ASC, id ASC
             FOR UPDATE"
        );
        $batchStmt->execute([$productId]);
        $batches = $batchStmt->fetchAll();

        $prodStmt = $pdo->prepare("SELECT name FROM products WHERE id = ?");
        $prodStmt->execute([$productId]);
        $productName = $prodStmt->fetch()['name'] ?? "Product #$productId";

        $totalAvailable = array_reduce($batches, fn($sum, $b) => $sum + (float)$b['quantity_remaining'], 0);
        if ($totalAvailable < $qtyNeeded) {
            throw new Exception("Insufficient stock for \"$productName\". Available: $totalAvailable, requested: $qtyNeeded", 409);
        }

        foreach ($batches as $batch) {
            if ($qtyNeeded <= 0) break;
            $take = min((float)$batch['quantity_remaining'], $qtyNeeded);
            $newRemaining = (float)$batch['quantity_remaining'] - $take;
            $newStatus = $newRemaining <= 0 ? 'depleted' : $batch['status'];

            $pdo->prepare("UPDATE product_batches SET quantity_remaining = ?, status = ? WHERE id = ?")
                ->execute([$newRemaining, $newStatus, $batch['id']]);

            $lineTotal = $take * (float)$batch['selling_price'];
            $lineCost = $take * (float)$batch['buying_price'];

            $saleItemsToInsert[] = [
                'productId' => $productId, 'batchId' => $batch['id'], 'quantity' => $take,
                'unitPrice' => $batch['selling_price'], 'unitCost' => $batch['buying_price'],
                'lineTotal' => $lineTotal, 'lineProfit' => $lineTotal - $lineCost
            ];
            $inventoryLogsToInsert[] = [
                'productId' => $productId, 'batchId' => $batch['id'],
                'quantityChange' => -$take, 'quantityAfter' => $newRemaining
            ];

            $subtotal += $lineTotal;
            $totalCost += $lineCost;
            $qtyNeeded -= $take;
        }
    }

    $taxableAmount = max($subtotal - $discountAmount, 0);
    $taxAmount = round($taxableAmount * ($taxRate / 100), 2);
    $totalAmount = round($taxableAmount + $taxAmount, 2);
    $profitAmount = round($subtotal - $totalCost - $discountAmount, 2);
    $saleNumber = generateSaleNumber();

    $saleStmt = $pdo->prepare(
        "INSERT INTO sales (sale_number, customer_id, cashier_id, subtotal, discount_amount, tax_amount, total_amount, total_cost, profit_amount, payment_method, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid')"
    );
    $saleStmt->execute([
        $saleNumber, $customerId, $user['id'], $subtotal, $discountAmount, $taxAmount,
        $totalAmount, $totalCost, $profitAmount, $paymentMethod
    ]);
    $saleId = $pdo->lastInsertId();

    $itemStmt = $pdo->prepare(
        "INSERT INTO sales_items (sale_id, product_id, batch_id, quantity, unit_price, unit_cost, line_total, line_profit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    foreach ($saleItemsToInsert as $si) {
        $itemStmt->execute([$saleId, $si['productId'], $si['batchId'], $si['quantity'], $si['unitPrice'], $si['unitCost'], $si['lineTotal'], $si['lineProfit']]);
    }

    $logStmt = $pdo->prepare(
        "INSERT INTO inventory_logs (product_id, batch_id, change_type, quantity_change, quantity_after, reference_id, created_by)
         VALUES (?, ?, 'sale', ?, ?, ?, ?)"
    );
    foreach ($inventoryLogsToInsert as $log) {
        $logStmt->execute([$log['productId'], $log['batchId'], $log['quantityChange'], $log['quantityAfter'], $saleId, $user['id']]);
    }

    $pdo->prepare("INSERT INTO payments (sale_id, amount, method, received_by) VALUES (?, ?, ?, ?)")
        ->execute([$saleId, $totalAmount, $paymentMethod, $user['id']]);

    $pdo->commit();
    logAudit($user['id'], 'SALE_CREATED', 'sales', "Sale $saleNumber - total $totalAmount");

    jsonSuccess([
        'message' => 'Sale completed successfully',
        'sale' => [
            'id' => $saleId, 'saleNumber' => $saleNumber, 'subtotal' => $subtotal,
            'discount' => $discountAmount, 'taxAmount' => $taxAmount, 'totalAmount' => $totalAmount,
            'profitAmount' => $profitAmount, 'itemCount' => count($saleItemsToInsert)
        ]
    ], 201);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $code = (int)$e->getCode();
    $status = in_array($code, [400, 403, 404, 409]) ? $code : 500;
    if ($status === 500) error_log('Sale error: ' . $e->getMessage());
    jsonError($status === 500 ? 'Failed to process sale' : $e->getMessage(), $status);
}
