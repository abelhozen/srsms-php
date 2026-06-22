<?php
/**
 * Shared data-fetching functions used by every report endpoint.
 * This file is included by other report scripts, not accessed directly.
 */
if (!defined('SRSMS_BOOTSTRAPPED') && basename($_SERVER['SCRIPT_FILENAME']) === basename(__FILE__)) {
    http_response_code(403);
    exit('Direct access forbidden');
}

function getDateRange() {
    $to = $_GET['to'] ?? date('Y-m-d');
    $from = $_GET['from'] ?? date('Y-m-d', strtotime('-30 days'));
    return [$from, $to];
}

function getSalesReportData($pdo, $from, $to) {
    $stmt = $pdo->prepare(
        "SELECT s.sale_number, s.created_at, u.full_name AS cashier, s.subtotal, s.discount_amount,
                s.tax_amount, s.total_amount, s.profit_amount, s.payment_method, s.status
         FROM sales s JOIN users u ON u.id = s.cashier_id
         WHERE DATE(s.created_at) BETWEEN ? AND ?
         ORDER BY s.created_at ASC"
    );
    $stmt->execute([$from, $to]);
    return $stmt->fetchAll();
}

function getProfitLossData($pdo, $from, $to) {
    $salesStmt = $pdo->prepare(
        "SELECT COALESCE(SUM(total_amount),0) AS revenue, COALESCE(SUM(total_cost),0) AS cogs,
                COALESCE(SUM(profit_amount),0) AS gross_profit
         FROM sales WHERE status='completed' AND DATE(created_at) BETWEEN ? AND ?"
    );
    $salesStmt->execute([$from, $to]);
    $salesAgg = $salesStmt->fetch();

    $expStmt = $pdo->prepare(
        "SELECT COALESCE(SUM(amount),0) AS total_expenses FROM expenses
         WHERE status='approved' AND expense_date BETWEEN ? AND ?"
    );
    $expStmt->execute([$from, $to]);
    $expenseAgg = $expStmt->fetch();

    $breakdownStmt = $pdo->prepare(
        "SELECT ec.name AS category, COALESCE(SUM(e.amount),0) AS amount
         FROM expenses e LEFT JOIN expense_categories ec ON ec.id = e.category_id
         WHERE e.status='approved' AND e.expense_date BETWEEN ? AND ?
         GROUP BY ec.name"
    );
    $breakdownStmt->execute([$from, $to]);
    $expenseBreakdown = $breakdownStmt->fetchAll();

    $lossStmt = $pdo->prepare(
        "SELECT il.change_type, COALESCE(SUM(ABS(il.quantity_change) * b.buying_price),0) AS loss_value
         FROM inventory_logs il JOIN product_batches b ON b.id = il.batch_id
         WHERE il.change_type IN ('expiry','damage','expired','damaged') AND DATE(il.created_at) BETWEEN ? AND ?
         GROUP BY il.change_type"
    );
    $lossStmt->execute([$from, $to]);
    $expiredDamaged = $lossStmt->fetchAll();

    $revenue = (float)$salesAgg['revenue'];
    $cogs = (float)$salesAgg['cogs'];
    $grossProfit = (float)$salesAgg['gross_profit'];
    $totalExpenses = (float)$expenseAgg['total_expenses'];
    $netProfit = round($grossProfit - $totalExpenses, 2);
    $totalLoss = array_reduce($expiredDamaged, fn($sum, $r) => $sum + (float)$r['loss_value'], 0);

    return compact('revenue', 'cogs', 'grossProfit', 'totalExpenses', 'netProfit', 'expenseBreakdown', 'totalLoss', 'expiredDamaged');
}

function getInventoryReportData($pdo) {
    $stmt = $pdo->query("
        SELECT p.product_code, p.name, c.name AS category,
               COALESCE(SUM(b.quantity_remaining),0) AS total_stock,
               COALESCE(SUM(b.quantity_remaining * b.buying_price),0) AS stock_value,
               MIN(b.expiry_date) AS nearest_expiry
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_batches b ON b.product_id = p.id AND b.status = 'active'
        WHERE p.status = 'active'
        GROUP BY p.id
        ORDER BY p.name
    ");
    return $stmt->fetchAll();
}

function getShopName($pdo) {
    $stmt = $pdo->query("SELECT shop_name, currency FROM settings LIMIT 1");
    $row = $stmt->fetch();
    return $row ?: ['shop_name' => 'My Shop', 'currency' => 'TZS'];
}
