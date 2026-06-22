<?php
/**
 * GET /api/reports/inventory-excel.php
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/_report_data.php';

requirePermission('reports.export');
$pdo = getDB();

$rows = getInventoryReportData($pdo);

header('Content-Type: application/vnd.ms-excel; charset=utf-8');
header('Content-Disposition: attachment; filename="inventory-report.xls"');

$out = fopen('php://output', 'w');
fputs($out, "\xEF\xBB\xBF");

fputcsv($out, ['Product Code', 'Product Name', 'Category', 'Stock Qty', 'Stock Value', 'Nearest Expiry'], "\t");
foreach ($rows as $r) {
    fputcsv($out, [
        $r['product_code'],
        $r['name'],
        $r['category'] ?: '-',
        $r['total_stock'],
        number_format((float)$r['stock_value'], 2, '.', ''),
        $r['nearest_expiry'] ? date('d M Y', strtotime($r['nearest_expiry'])) : '-',
    ], "\t");
}
fclose($out);
exit;
