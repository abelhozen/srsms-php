<?php
/**
 * GET /api/dashboard/health.php
 * "Business health" snapshot for owners/managers:
 * current stock value, expiring-soon value at risk, low-stock count,
 * and pending approvals - the things a Boss needs to glance at daily.
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'admin', 'owner', 'manager', 'accountant']);
$pdo = getDB();

// Current stock value (what's sitting on shelves, at cost price)
$stockValueStmt = $pdo->query(
    "SELECT COALESCE(SUM(quantity_remaining * buying_price), 0) AS stock_value,
            COALESCE(SUM(quantity_remaining * selling_price), 0) AS potential_revenue
     FROM product_batches WHERE status = 'active' AND quantity_remaining > 0"
);
$stockValue = $stockValueStmt->fetch();

// Value at risk from batches expiring within the alert window
$settingsStmt = $pdo->query("SELECT expiry_alert_days FROM settings LIMIT 1");
$alertDays = (int)($settingsStmt->fetch()['expiry_alert_days'] ?? 30);

$atRiskStmt = $pdo->prepare(
    "SELECT COUNT(*) AS batch_count, COALESCE(SUM(quantity_remaining * buying_price), 0) AS value_at_risk
     FROM product_batches
     WHERE status = 'active' AND quantity_remaining > 0
       AND expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)"
);
$atRiskStmt->execute([$alertDays]);
$atRisk = $atRiskStmt->fetch();

// Already expired but not yet written off
$expiredStmt = $pdo->query(
    "SELECT COUNT(*) AS batch_count, COALESCE(SUM(quantity_remaining * buying_price), 0) AS value
     FROM product_batches
     WHERE status = 'active' AND quantity_remaining > 0
       AND expiry_date IS NOT NULL AND expiry_date < CURDATE()"
);
$expired = $expiredStmt->fetch();

// Low stock count
$lowStockStmt = $pdo->query(
    "SELECT COUNT(*) AS cnt FROM (
        SELECT p.id, p.reorder_level, COALESCE(SUM(b.quantity_remaining), 0) AS stock
        FROM products p
        LEFT JOIN product_batches b ON b.product_id = p.id AND b.status = 'active'
        WHERE p.status = 'active'
        GROUP BY p.id
        HAVING stock <= p.reorder_level
    ) t"
);
$lowStockCount = (int)$lowStockStmt->fetch()['cnt'];

// Pending expense approvals
$pendingExpenseStmt = $pdo->query(
    "SELECT COUNT(*) AS cnt, COALESCE(SUM(amount), 0) AS total FROM expenses WHERE status = 'pending'"
);
$pendingExpenses = $pendingExpenseStmt->fetch();

// Lifetime totals (all-time loss from damaged/expired stock)
$lifetimeLossStmt = $pdo->query(
    "SELECT COALESCE(SUM(ABS(il.quantity_change) * b.buying_price), 0) AS total_loss
     FROM inventory_logs il JOIN product_batches b ON b.id = il.batch_id
     WHERE il.change_type IN ('damage','expiry')"
);
$lifetimeLoss = (float)$lifetimeLossStmt->fetch()['total_loss'];

// Products that exist but have zero sellable stock - these are invisible
// in the POS and the Boss needs to know about them before a cashier reports
// "I can't find this item to sell".
$noStockStmt = $pdo->query(
    "SELECT p.id, p.name, p.product_code FROM products p
     LEFT JOIN product_batches b ON b.product_id = p.id AND b.status = 'active'
     WHERE p.status = 'active'
     GROUP BY p.id
     HAVING COALESCE(SUM(b.quantity_remaining), 0) <= 0
     ORDER BY p.name
     LIMIT 20"
);
$noStockProducts = $noStockStmt->fetchAll();

jsonSuccess([
    'health' => [
        'stockValue' => (float)$stockValue['stock_value'],
        'potentialRevenue' => (float)$stockValue['potential_revenue'],
        'expiringSoon' => [
            'batchCount' => (int)$atRisk['batch_count'],
            'valueAtRisk' => (float)$atRisk['value_at_risk'],
            'alertWindowDays' => $alertDays
        ],
        'alreadyExpired' => [
            'batchCount' => (int)$expired['batch_count'],
            'value' => (float)$expired['value']
        ],
        'lowStockProductCount' => $lowStockCount,
        'noStockProducts' => $noStockProducts,
        'pendingExpenses' => [
            'count' => (int)$pendingExpenses['cnt'],
            'total' => (float)$pendingExpenses['total']
        ],
        'lifetimeStockLoss' => $lifetimeLoss
    ]
]);
