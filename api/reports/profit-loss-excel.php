<?php
/**
 * GET /api/reports/profit-loss-excel.php?from=&to=
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/_report_data.php';

requirePermission('reports.export');
$pdo = getDB();

[$from, $to] = getDateRange();
$data = getProfitLossData($pdo, $from, $to);

header('Content-Type: application/vnd.ms-excel; charset=utf-8');
header("Content-Disposition: attachment; filename=\"profit-loss-{$from}_to_{$to}.xls\"");

$out = fopen('php://output', 'w');
fputs($out, "\xEF\xBB\xBF");

fputcsv($out, ['Profit & Loss Statement', "$from to $to"], "\t");
fputcsv($out, [], "\t");
fputcsv($out, ['Total Revenue', number_format($data['revenue'], 2, '.', '')], "\t");
fputcsv($out, ['COGS', number_format($data['cogs'], 2, '.', '')], "\t");
fputcsv($out, ['Gross Profit', number_format($data['grossProfit'], 2, '.', '')], "\t");
fputcsv($out, ['Total Expenses', number_format($data['totalExpenses'], 2, '.', '')], "\t");
fputcsv($out, ['Net Profit', number_format($data['netProfit'], 2, '.', '')], "\t");
fputcsv($out, ['Expired/Damaged Loss', number_format($data['totalLoss'], 2, '.', '')], "\t");
fputcsv($out, [], "\t");
fputcsv($out, ['Expense Category', 'Amount'], "\t");
foreach ($data['expenseBreakdown'] as $e) {
    fputcsv($out, [$e['category'] ?: 'Uncategorized', number_format((float)$e['amount'], 2, '.', '')], "\t");
}
fclose($out);
exit;
