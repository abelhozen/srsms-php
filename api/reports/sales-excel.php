<?php
/**
 * GET /api/reports/sales-excel.php?from=&to=
 * Outputs CSV with .xls extension - opens natively in Excel/Sheets, no library needed.
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/_report_data.php';

requirePermission('reports.export');
$pdo = getDB();

[$from, $to] = getDateRange();
$rows = getSalesReportData($pdo, $from, $to);

header('Content-Type: application/vnd.ms-excel; charset=utf-8');
header("Content-Disposition: attachment; filename=\"sales-report-{$from}_to_{$to}.xls\"");

$out = fopen('php://output', 'w');
fputs($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel renders special characters correctly

fputcsv($out, ['Sale #', 'Date', 'Cashier', 'Subtotal', 'Discount', 'Tax', 'Total', 'Profit', 'Payment Method', 'Status'], "\t");
foreach ($rows as $r) {
    fputcsv($out, [
        $r['sale_number'],
        date('d M Y H:i', strtotime($r['created_at'])),
        $r['cashier'],
        number_format((float)$r['subtotal'], 2, '.', ''),
        number_format((float)$r['discount_amount'], 2, '.', ''),
        number_format((float)$r['tax_amount'], 2, '.', ''),
        number_format((float)$r['total_amount'], 2, '.', ''),
        number_format((float)$r['profit_amount'], 2, '.', ''),
        $r['payment_method'],
        $r['status'],
    ], "\t");
}
fclose($out);
exit;
