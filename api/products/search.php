<?php
/**
 * GET /api/products/search.php?q=
 * Fast POS search - returns only in-stock active products with next FIFO price.
 * If a product is seller-restricted, it's hidden from cashiers who aren't
 * on its authorized seller list (Super Admin/Admin can always see everything).
 */
require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['super_admin', 'manager', 'cashier']);
$pdo = getDB();

$q = $_GET['q'] ?? '';
$canBypassRestriction = in_array($user['role'], ['super_admin', 'manager'], true);

$sql = "SELECT p.id, p.product_code, p.name, p.unit,
               COALESCE(SUM(b.quantity_remaining), 0) AS total_stock,
               (SELECT selling_price FROM product_batches
                WHERE product_id = p.id AND status='active' AND quantity_remaining > 0
                ORDER BY received_date ASC, id ASC LIMIT 1) AS next_price
        FROM products p
        LEFT JOIN product_batches b ON b.product_id = p.id AND b.status='active' AND b.quantity_remaining > 0
        WHERE p.status = 'active' AND (p.name LIKE ? OR p.product_code LIKE ?)";

$params = ["%$q%", "%$q%"];

if (!$canBypassRestriction) {
    $sql .= " AND (p.restrict_sellers = 0 OR EXISTS (
                SELECT 1 FROM product_authorized_sellers pas
                WHERE pas.product_id = p.id AND pas.user_id = ?
              ))";
    $params[] = $user['id'];
}

$sql .= " GROUP BY p.id HAVING total_stock > 0 ORDER BY p.name ASC LIMIT 20";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
jsonSuccess(['products' => $stmt->fetchAll()]);
