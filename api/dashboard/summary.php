<?php
/**
 * GET /api/dashboard/summary.php
 * Gross Profit = Sales - COGS
 * Net Profit = Gross Profit - Expenses
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireAuth();
$pdo = getDB();

$isFinancial = in_array($user['role'], ['super_admin', 'owner', 'manager', 'accountant', 'auditor'], true);

$periods = [
    'today' => "DATE(s.created_at) = CURDATE()",
    'month' => "YEAR(s.created_at) = YEAR(CURDATE()) AND MONTH(s.created_at) = MONTH(CURDATE())",
    'year' => "YEAR(s.created_at) = YEAR(CURDATE())"
];

$result = [];

foreach ($periods as $key => $condition) {
    $salesStmt = $pdo->query(
        "SELECT COALESCE(SUM(total_amount),0) AS revenue,
                COALESCE(SUM(total_cost),0) AS cogs,
                COALESCE(SUM(profit_amount),0) AS gross_profit,
                COUNT(*) AS transaction_count
         FROM sales s WHERE status = 'completed' AND $condition"
    );
    $salesRow = $salesStmt->fetch();

    $expenseCondition = $key === 'today' ? 'expense_date = CURDATE()'
        : ($key === 'month' ? 'YEAR(expense_date)=YEAR(CURDATE()) AND MONTH(expense_date)=MONTH(CURDATE())'
        : 'YEAR(expense_date)=YEAR(CURDATE())');

    $expenseStmt = $pdo->query(
        "SELECT COALESCE(SUM(amount),0) AS total_expenses FROM expenses WHERE status='approved' AND $expenseCondition"
    );
    $expenseRow = $expenseStmt->fetch();

    $data = [
        'revenue' => (float)$salesRow['revenue'],
        'transactionCount' => (int)$salesRow['transaction_count']
    ];

    if ($isFinancial) {
        $lossCondition = $key === 'today' ? 'DATE(il.created_at) = CURDATE()'
            : ($key === 'month' ? 'YEAR(il.created_at)=YEAR(CURDATE()) AND MONTH(il.created_at)=MONTH(CURDATE())'
            : 'YEAR(il.created_at)=YEAR(CURDATE())');

        $lossStmt = $pdo->query(
            "SELECT COALESCE(SUM(ABS(il.quantity_change) * b.buying_price),0) AS stock_loss
             FROM inventory_logs il JOIN product_batches b ON b.id = il.batch_id
             WHERE il.change_type IN ('damage','expiry','damaged','expired') AND $lossCondition"
        );
        $stockLoss = (float)$lossStmt->fetch()['stock_loss'];

        $data['cogs'] = (float)$salesRow['cogs'];
        $data['grossProfit'] = (float)$salesRow['gross_profit'];
        $data['expenses'] = (float)$expenseRow['total_expenses'];
        $data['stockLoss'] = $stockLoss;
        $data['netProfit'] = round($data['grossProfit'] - $data['expenses'] - $stockLoss, 2);
    }

    $result[$key] = $data;
}

if ($isFinancial) {
    $lastMonthStmt = $pdo->query(
        "SELECT COALESCE(SUM(total_amount),0) AS revenue FROM sales
         WHERE status='completed' AND YEAR(created_at)=YEAR(CURDATE() - INTERVAL 1 MONTH)
         AND MONTH(created_at)=MONTH(CURDATE() - INTERVAL 1 MONTH)"
    );
    $lastMonthRevenue = (float)$lastMonthStmt->fetch()['revenue'];
    $growth = $lastMonthRevenue > 0
        ? round((($result['month']['revenue'] - $lastMonthRevenue) / $lastMonthRevenue) * 100, 2)
        : null;
    $result['month']['growthPercent'] = $growth;
}

jsonSuccess(['summary' => $result, 'isFinancialView' => $isFinancial]);
