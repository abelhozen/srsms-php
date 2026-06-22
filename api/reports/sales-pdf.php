<?php
/**
 * GET /api/reports/sales-pdf.php?from=&to=
 * Outputs a print-ready HTML page (browser's "Save as PDF" produces the file).
 * No Composer/TCPDF dependency needed - works on any plain PHP host.
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/_report_data.php';

requirePermission('reports.export');
$pdo = getDB();

[$from, $to] = getDateRange();
$rows = getSalesReportData($pdo, $from, $to);
$shop = getShopName($pdo);
$totalRevenue = array_reduce($rows, fn($sum, $r) => $sum + (float)$r['total_amount'], 0);

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Sales Report <?= htmlspecialchars($from) ?> to <?= htmlspecialchars($to) ?></title>
<style>
    @media print { .print-bar { display: none; } @page { margin: 18mm; } }
    body { font-family: Arial, Helvetica, sans-serif; color: #0F172A; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 2px; }
    .sub { color: #64748B; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; background: #F1F5F9; padding: 8px 10px; border-bottom: 2px solid #CBD5E1; }
    td { padding: 7px 10px; border-bottom: 1px solid #E2E8F0; }
    .total-row { font-weight: bold; font-size: 14px; margin-top: 16px; }
    .print-bar { margin-bottom: 20px; }
    .print-bar button { padding: 8px 16px; background: #0F172A; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
</style>
</head>
<body>
    <div class="print-bar"><button onclick="window.print()">🖨 Print / Save as PDF</button></div>
    <h1><?= htmlspecialchars($shop['shop_name']) ?> — Sales Report</h1>
    <div class="sub"><?= htmlspecialchars($from) ?> to <?= htmlspecialchars($to) ?> · Generated <?= date('d M Y H:i') ?></div>
    <table>
        <thead><tr><th>Sale #</th><th>Date</th><th>Cashier</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
        <?php if (empty($rows)): ?>
            <tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:24px;">No sales in this period.</td></tr>
        <?php else: foreach ($rows as $r): ?>
            <tr>
                <td><?= htmlspecialchars($r['sale_number']) ?></td>
                <td><?= date('d M Y H:i', strtotime($r['created_at'])) ?></td>
                <td><?= htmlspecialchars($r['cashier']) ?></td>
                <td><?= htmlspecialchars($shop['currency']) ?> <?= number_format((float)$r['total_amount'], 2) ?></td>
                <td><?= htmlspecialchars($r['status']) ?></td>
            </tr>
        <?php endforeach; endif; ?>
        </tbody>
    </table>
    <div class="total-row">Total Revenue: <?= htmlspecialchars($shop['currency']) ?> <?= number_format($totalRevenue, 2) ?></div>
</body>
</html>
