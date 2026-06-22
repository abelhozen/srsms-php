<?php
/**
 * GET /api/reports/profit-loss-pdf.php?from=&to=
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/_report_data.php';

requirePermission('reports.export');
$pdo = getDB();

[$from, $to] = getDateRange();
$data = getProfitLossData($pdo, $from, $to);
$shop = getShopName($pdo);

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Profit &amp; Loss <?= htmlspecialchars($from) ?> to <?= htmlspecialchars($to) ?></title>
<style>
    @media print { .print-bar { display: none; } @page { margin: 18mm; } }
    body { font-family: Arial, Helvetica, sans-serif; color: #0F172A; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 2px; }
    .sub { color: #64748B; font-size: 12px; margin-bottom: 24px; }
    .line { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #E2E8F0; font-size:14px; max-width:480px; }
    .line.bold { font-weight:bold; font-size:16px; border-bottom:2px solid #0F172A; }
    table { width:100%; max-width:480px; border-collapse: collapse; font-size: 12px; margin-top:20px; }
    th { text-align: left; background: #F1F5F9; padding: 8px 10px; border-bottom: 2px solid #CBD5E1; }
    td { padding: 7px 10px; border-bottom: 1px solid #E2E8F0; }
    .print-bar { margin-bottom: 20px; }
    .print-bar button { padding: 8px 16px; background: #0F172A; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
</style>
</head>
<body>
    <div class="print-bar"><button onclick="window.print()">🖨 Print / Save as PDF</button></div>
    <h1><?= htmlspecialchars($shop['shop_name']) ?> — Profit &amp; Loss Statement</h1>
    <div class="sub"><?= htmlspecialchars($from) ?> to <?= htmlspecialchars($to) ?> · Generated <?= date('d M Y H:i') ?></div>

    <div class="line"><span>Total Revenue</span><span><?= htmlspecialchars($shop['currency']) ?> <?= number_format($data['revenue'], 2) ?></span></div>
    <div class="line"><span>Cost of Goods Sold (COGS)</span><span><?= htmlspecialchars($shop['currency']) ?> <?= number_format($data['cogs'], 2) ?></span></div>
    <div class="line bold"><span>Gross Profit</span><span><?= htmlspecialchars($shop['currency']) ?> <?= number_format($data['grossProfit'], 2) ?></span></div>
    <div class="line"><span>Total Expenses</span><span><?= htmlspecialchars($shop['currency']) ?> <?= number_format($data['totalExpenses'], 2) ?></span></div>
    <div class="line bold"><span>Net Profit</span><span><?= htmlspecialchars($shop['currency']) ?> <?= number_format($data['netProfit'], 2) ?></span></div>
    <div class="line"><span>Expired/Damaged Stock Loss</span><span><?= htmlspecialchars($shop['currency']) ?> <?= number_format($data['totalLoss'], 2) ?></span></div>

    <h3 style="margin-top:28px;font-size:14px;">Expense Breakdown by Category</h3>
    <table>
        <thead><tr><th>Category</th><th>Amount</th></tr></thead>
        <tbody>
        <?php if (empty($data['expenseBreakdown'])): ?>
            <tr><td colspan="2" style="text-align:center;color:#94A3B8;padding:16px;">No approved expenses in this period.</td></tr>
        <?php else: foreach ($data['expenseBreakdown'] as $e): ?>
            <tr>
                <td><?= htmlspecialchars($e['category'] ?: 'Uncategorized') ?></td>
                <td><?= htmlspecialchars($shop['currency']) ?> <?= number_format((float)$e['amount'], 2) ?></td>
            </tr>
        <?php endforeach; endif; ?>
        </tbody>
    </table>
</body>
</html>
