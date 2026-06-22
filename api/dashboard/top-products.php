<?php
/**
 * GET /api/dashboard/top-products.php?limit=10
 */
require_once __DIR__ . '/../../config/bootstrap.php';

requireAuth();
$pdo = getDB();

$limit = (int)($_GET['limit'] ?? 10);

$stmt = $pdo->prepare(
    "SELECT p.id, p.name, p.product_code,
            SUM(si.quantity) AS units_sold,
            SUM(si.line_total) AS revenue
     FROM sales_items si
     JOIN products p ON p.id = si.product_id
     JOIN sales s ON s.id = si.sale_id
     WHERE s.status = 'completed'
     GROUP BY p.id
     ORDER BY units_sold DESC
     LIMIT " . $limit
);
$stmt->execute();
jsonSuccess(['topProducts' => $stmt->fetchAll()]);
