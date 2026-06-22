/* ============================================================
   POS Page - cashier workflow
   ============================================================ */

let posCart = []; // { productId, name, unit, price, qty, maxStock }
let posSearchTimeout = null;

async function renderPosPage(container) {
    container.innerHTML = `
        <div class="pos-layout">
            <div class="pos-products">
                <div class="pos-search-bar">
                    <input type="text" id="posSearchInput" placeholder="Search product by name or code..." autofocus />
                </div>
                <div class="pos-product-grid" id="posProductGrid">
                    <div class="empty-state" style="grid-column:1/-1;"><div class="icon">🔍</div><p>Start typing to search products...</p></div>
                </div>
            </div>
            <div class="pos-cart">
                <div class="pos-cart-header">Current Sale</div>
                <div class="pos-cart-items" id="posCartItems">
                    <div class="empty-state"><div class="icon">🛒</div><p>Cart is empty</p></div>
                </div>
                <div class="pos-cart-summary">
                    <div class="summary-row"><span>Subtotal</span><span id="posSubtotal">${formatMoney(0)}</span></div>
                    <div class="summary-row">
                        <span>Discount</span>
                        <input type="number" id="posDiscount" value="0" min="0" style="width:90px; text-align:right; padding:4px 8px; border:1px solid var(--border); border-radius:4px;" />
                    </div>
                    <div class="form-group" style="margin:10px 0 4px;">
                        <label>Payment Method</label>
                        <select id="posPaymentMethod">
                            <option value="cash">Cash</option>
                            <option value="mobile_money">Mobile Money</option>
                            <option value="card">Card</option>
                            <option value="credit">Credit</option>
                        </select>
                    </div>
                    <div class="summary-row total"><span>Total</span><span id="posTotal">${formatMoney(0)}</span></div>
                    <button class="btn btn-green" style="width:100%; justify-content:center; margin-top:12px; padding:13px;" id="posCheckoutBtn" onclick="handleCheckout()">
                        Complete Sale
                    </button>
                    <button class="btn btn-outline" style="width:100%; justify-content:center; margin-top:8px;" onclick="clearCart()">Clear Cart</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('posSearchInput').addEventListener('input', (e) => {
        clearTimeout(posSearchTimeout);
        const q = e.target.value.trim();
        if (q.length < 1) {
            document.getElementById('posProductGrid').innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🔍</div><p>Start typing to search products...</p></div>`;
            return;
        }
        posSearchTimeout = setTimeout(() => doPosSearch(q), 180); // debounce for fast feel
    });

    document.getElementById('posDiscount').addEventListener('input', renderCartSummary);

    posCart = [];
    renderCart();
}

async function doPosSearch(query) {
    const grid = document.getElementById('posProductGrid');
    try {
        const res = await Api.searchProducts(query);
        const products = res.products;
        if (products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <div class="icon">📦</div>
                    <p>No matching products in stock.</p>
                    <p style="font-size:11.5px; color:var(--text-muted); margin-top:6px; max-width:320px; margin-left:auto; margin-right:auto;">
                        If you just added this product, make sure a <strong>Batch</strong> with quantity was added too —
                        products with zero stock don't appear here. Ask your Manager or Store Keeper to check
                        "Products & Stock".
                    </p>
                </div>`;
            return;
        }
        grid.innerHTML = products.map(p => `
            <div class="pos-product-card" onclick="addToCart(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}', '${p.unit}', ${p.next_price || 0}, ${p.total_stock})">
                <div class="pname">${escapeHtml(p.name)}</div>
                <div class="pprice">${formatMoney(p.next_price)}</div>
                <div class="pstock">${p.total_stock} ${escapeHtml(p.unit)} in stock</div>
            </div>
        `).join('');
    } catch (err) {
        console.error('POS SEARCH ERROR DETAIL:', err);
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">⚠️</div><p>Search failed. Try again.</p></div>`;
    }
}

function addToCart(productId, name, unit, price, maxStock) {
    const existing = posCart.find(i => i.productId === productId);
    if (existing) {
        if (existing.qty + 1 > maxStock) {
            showError(`Only ${maxStock} ${unit} available for ${name}`);
            return;
        }
        existing.qty += 1;
    } else {
        if (maxStock < 1) { showError(`${name} is out of stock`); return; }
        posCart.push({ productId, name, unit, price, qty: 1, maxStock });
    }
    renderCart();
}

function updateCartQty(productId, delta) {
    const item = posCart.find(i => i.productId === productId);
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty <= 0) {
        posCart = posCart.filter(i => i.productId !== productId);
    } else if (newQty > item.maxStock) {
        showError(`Only ${item.maxStock} ${item.unit} available`);
        return;
    } else {
        item.qty = newQty;
    }
    renderCart();
}

function removeFromCart(productId) {
    posCart = posCart.filter(i => i.productId !== productId);
    renderCart();
}

function clearCart() {
    posCart = [];
    renderCart();
}

function renderCart() {
    const holder = document.getElementById('posCartItems');
    if (!holder) return;
    if (posCart.length === 0) {
        holder.innerHTML = `<div class="empty-state"><div class="icon">🛒</div><p>Cart is empty</p></div>`;
    } else {
        holder.innerHTML = posCart.map(item => `
            <div class="cart-item">
                <div>
                    <div class="ci-name">${escapeHtml(item.name)}</div>
                    <div class="ci-meta">${formatMoney(item.price)} × ${item.qty}</div>
                </div>
                <div class="ci-qty-controls">
                    <button class="qty-btn" onclick="updateCartQty(${item.productId}, -1)">−</button>
                    <span style="min-width:20px; text-align:center; font-weight:600;">${item.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty(${item.productId}, 1)">+</button>
                    <button class="qty-btn" style="margin-left:4px;color:var(--accent-red);" onclick="removeFromCart(${item.productId})">×</button>
                </div>
            </div>
        `).join('');
    }
    renderCartSummary();
}

function renderCartSummary() {
    const subtotal = posCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const discount = parseFloat(document.getElementById('posDiscount')?.value || 0) || 0;
    const total = Math.max(subtotal - discount, 0);
    document.getElementById('posSubtotal').textContent = formatMoney(subtotal);
    document.getElementById('posTotal').textContent = formatMoney(total);

    const btn = document.getElementById('posCheckoutBtn');
    if (btn) btn.disabled = posCart.length === 0;
}

async function handleCheckout() {
    if (posCart.length === 0) return;
    const btn = document.getElementById('posCheckoutBtn');
    const discount = parseFloat(document.getElementById('posDiscount').value || 0) || 0;
    const paymentMethod = document.getElementById('posPaymentMethod').value;

    btn.disabled = true;
    btn.innerHTML = `<div class="loading-spinner" style="border-color:rgba(255,255,255,0.3); border-top-color:white; width:16px; height:16px;"></div>`;

    try {
        const payload = {
            items: posCart.map(i => ({ productId: i.productId, quantity: i.qty })),
            discountAmount: discount,
            paymentMethod
        };
        const res = await Api.createSale(payload);
        showToast(`Sale completed: ${res.sale.saleNumber}`, 'success');
        clearCart();
        document.getElementById('posDiscount').value = 0;
        document.getElementById('posSearchInput').value = '';
        document.getElementById('posProductGrid').innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🔍</div><p>Start typing to search products...</p></div>`;
        checkNotifications();
    } catch (err) {
        showError(err);
    } finally {
        btn.disabled = posCart.length === 0;
        btn.textContent = 'Complete Sale';
    }
}
