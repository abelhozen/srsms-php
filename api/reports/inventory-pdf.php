<?php
/**
 * GET /api/reports/inventory-pdf.php
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/_report_data.php';

requirePermission('reports.export');
$pdo = getDB();

$rows = getInventoryReportData($pdo);
$shop = getShopName($pdo);

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Inventory Report</title>
<style>
    @media print { .print-bar { display: none; } @page { margin: 18mm; } }
    body { font-family: Arial, Helvetica, sans-serif; color: #0F172A; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 2px; }
    .sub { color: #64748B; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; background: #F1F5F9; padding: 8px 10px; border-bottom: 2px solid #CBD5E1; }
    td { padding: 7px 10px; border-bottom: 1px solid #E2E8F0; }
    .print-bar { margin-bottom: 20px; }
    .print-bar button { padding: 8px 16px; background: #0F172A; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
</style>
</head>
<body>
    <div class="print-bar"><button onclick="window.print()">🖨 Print / Save as PDF</button></div>
    <h1><?= htmlspecialchars($shop['shop_name']) ?> — Inventory Batch Report</h1>
    <div class="sub">Generated <?= date('d M Y H:i') ?></div>
    <table>
        <thead><tr><th>Code</th><th>Product</th><th>Category</th><th>Stock</th><th>Stock Value</th><th>Nearest Expiry</th></tr></thead>
        <tbody>
        <?php if (empty($rows)): ?>
            <tr><td colspan="6" style="text-align:center;color:#94A3B8;padding:24px;">No active products found.</td></tr>
        <?php else: foreach ($rows as $r): ?>
            <tr>
                <td><?= htmlspecialchars($r['product_code']) ?></td>
                <td><?= htmlspecialchars($r['name']) ?></td>
                <td><?= htmlspecialchars($r['category'] ?: '-') ?></td>
                <td><?= htmlspecialchars($r['total_stock']) ?></td>
                <td><?= htmlspecialchars($shop['currency']) ?> <?= number_format((float)$r['stock_value'], 2) ?></td>
                <td><?= $r['nearest_expiry'] ? date('d M Y', strtotime($r['nearest_expiry'])) : '-' ?></td>
            </tr>
        <?php endforeach; endif; ?>
        </tbody>
    </table>
</body>
</html>
