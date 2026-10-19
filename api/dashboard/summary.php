<?php
/**
 * GET /api/dashboard/summary.php
 * Gross Profit = Sales - COGS
 * Net Profit = Gross Profit - Expenses
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireAuth();
$pdo = getDB();

$isFinancial = in_array($user['role'], ['super_admin', 'admin', 'owner', 'manager', 'accountant', 'auditor'], true);

$todayStart = date('Y-m-d 00:00:00');
$tomorrowStart = date('Y-m-d 00:00:00', strtotime('+1 day'));
$monthStart = date('Y-m-01 00:00:00');
$nextMonthStart = date('Y-m-01 00:00:00', strtotime('first day of next month'));
$yearStart = date('Y-01-01 00:00:00');
$nextYearStart = date('Y-01-01 00:00:00', strtotime('first day of january next year'));

$periods = [
    'today' => ['start' => $todayStart, 'end' => $tomorrowStart, 'expenseStart' => date('Y-m-d'), 'expenseEnd' => date('Y-m-d', strtotime('+1 day'))],
    'month' => ['start' => $monthStart, 'end' => $nextMonthStart, 'expenseStart' => date('Y-m-01'), 'expenseEnd' => date('Y-m-d', strtotime('first day of next month'))],
    'year' => ['start' => $yearStart, 'end' => $nextYearStart, 'expenseStart' => date('Y-01-01'), 'expenseEnd' => date('Y-m-d', strtotime('first day of january next year'))]
];

$result = [];

foreach ($periods as $key => $period) {
    $salesStmt = $pdo->prepare(
        "SELECT COALESCE(SUM(total_amount),0) AS revenue,
                COALESCE(SUM(total_cost),0) AS cogs,
                COALESCE(SUM(profit_amount),0) AS gross_profit,
                COUNT(*) AS transaction_count
         FROM sales
         WHERE status = 'completed' AND created_at >= ? AND created_at < ?"
    );
    $salesStmt->execute([$period['start'], $period['end']]);
    $salesRow = $salesStmt->fetch();

    $expenseStmt = $pdo->prepare(
        "SELECT COALESCE(SUM(amount),0) AS total_expenses
         FROM expenses
         WHERE status = 'approved' AND expense_date >= ? AND expense_date < ?"
    );
    $expenseStmt->execute([$period['expenseStart'], $period['expenseEnd']]);
    $expenseRow = $expenseStmt->fetch();

    $data = [
        'revenue' => (float)$salesRow['revenue'],
        'transactionCount' => (int)$salesRow['transaction_count']
    ];

    if ($isFinancial) {
        $lossStmt = $pdo->prepare(
            "SELECT COALESCE(SUM(ABS(il.quantity_change) * b.buying_price),0) AS stock_loss
             FROM inventory_logs il JOIN product_batches b ON b.id = il.batch_id
             WHERE il.change_type IN ('damage','expiry')
               AND il.created_at >= ? AND il.created_at < ?"
        );
        $lossStmt->execute([$period['start'], $period['end']]);
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
    $lastMonthStart = date('Y-m-01 00:00:00', strtotime('first day of last month'));
    $thisMonthStart = $monthStart;
    $lastMonthStmt = $pdo->prepare(
        "SELECT COALESCE(SUM(total_amount),0) AS revenue FROM sales
         WHERE status = 'completed' AND created_at >= ? AND created_at < ?"
    );
    $lastMonthStmt->execute([$lastMonthStart, $thisMonthStart]);
    $lastMonthRevenue = (float)$lastMonthStmt->fetch()['revenue'];
    $growth = $lastMonthRevenue > 0
        ? round((($result['month']['revenue'] - $lastMonthRevenue) / $lastMonthRevenue) * 100, 2)
        : null;
    $result['month']['growthPercent'] = $growth;
}

jsonSuccess(['summary' => $result, 'isFinancialView' => $isFinancial]);
