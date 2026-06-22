<?php
/**
 * GET /api/sales/daily-register.php?date=2026-06-21
 * "Who sold what today" - the daily register a Boss checks to know
 * exactly how much stock went out, who sold it, and what came in.
 * Defaults to today if no date given.
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'owner', 'manager', 'accountant', 'auditor']);
$pdo = getDB();

$date = $_GET['date'] ?? date('Y-m-d');

// Every line item sold on this date, with who sold it
$stmt = $pdo->prepare(
    "SELECT s.id AS sale_id, s.sale_number, s.created_at, s.status, s.payment_method,
            u.id AS cashier_id, u.full_name AS cashier_name,
            p.name AS product_name, p.product_code,
            si.quantity, si.unit_price, si.line_total, si.line_profit
     FROM sales_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN users u ON u.id = s.cashier_id
     JOIN products p ON p.id = si.product_id
     WHERE DATE(s.created_at) = ?
     ORDER BY s.created_at DESC, s.id DESC"
);
$stmt->execute([$date]);
$lines = $stmt->fetchAll();

// Per-cashier summary for the day - "who sold how much"
$cashierStmt = $pdo->prepare(
    "SELECT u.id AS cashier_id, u.full_name AS cashier_name,
            COUNT(DISTINCT s.id) AS sale_count,
            COALESCE(SUM(s.total_amount), 0) AS total_sales,
            COALESCE(SUM(s.profit_amount), 0) AS total_profit
     FROM sales s
     JOIN users u ON u.id = s.cashier_id
     WHERE DATE(s.created_at) = ? AND s.status = 'completed'
     GROUP BY u.id
     ORDER BY total_sales DESC"
);
$cashierStmt->execute([$date]);
$byCashier = $cashierStmt->fetchAll();

// Day totals
$totalStmt = $pdo->prepare(
    "SELECT COUNT(*) AS sale_count,
            COALESCE(SUM(total_amount), 0) AS total_sales,
            COALESCE(SUM(profit_amount), 0) AS total_profit,
            COALESCE(SUM(discount_amount), 0) AS total_discount
     FROM sales WHERE DATE(created_at) = ? AND status = 'completed'"
);
$totalStmt->execute([$date]);
$totals = $totalStmt->fetch();

// Voided sales on this date (Boss should see these too - red flag if frequent)
$voidStmt = $pdo->prepare(
    "SELECT s.sale_number, s.total_amount, u.full_name AS cashier_name, s.created_at
     FROM sales s JOIN users u ON u.id = s.cashier_id
     WHERE DATE(s.created_at) = ? AND s.status = 'voided'
     ORDER BY s.created_at DESC"
);
$voidStmt->execute([$date]);
$voided = $voidStmt->fetchAll();

jsonSuccess([
    'date' => $date,
    'lines' => $lines,
    'byCashier' => $byCashier,
    'voided' => $voided,
    'totals' => [
        'saleCount' => (int)$totals['sale_count'],
        'totalSales' => (float)$totals['total_sales'],
        'totalProfit' => (float)$totals['total_profit'],
        'totalDiscount' => (float)$totals['total_discount'],
    ]
]);
