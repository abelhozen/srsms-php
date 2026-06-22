/* ============================================================
   Sales History Page (with Daily Register tab for management)
   ============================================================ */

async function renderSalesPage(container) {
    const canSeeRegister = ['super_admin', 'owner', 'manager', 'accountant', 'auditor'].includes(Store.user.role);

    container.innerHTML = `
        ${canSeeRegister ? `
        <div class="tabs" id="salesTabs">
            <button class="tab-btn active" data-tab="history" onclick="switchSalesTab('history')">Sales History</button>
            <button class="tab-btn" data-tab="register" onclick="switchSalesTab('register')">📋 Daily Register</button>
        </div>` : ''}
        <div id="salesTabContent"></div>
    `;

    const startTab = (canSeeRegister && window.__salesDefaultTab) ? window.__salesDefaultTab : 'history';
    window.__salesDefaultTab = null; // consume one-time navigation intent
    window.__salesTab = startTab;

    if (canSeeRegister) {
        document.querySelectorAll('#salesTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === startTab));
    }

    if (startTab === 'register') await renderDailyRegisterTab();
    else await renderSalesHistoryTab();
}

function switchSalesTab(tab) {
    window.__salesTab = tab;
    document.querySelectorAll('#salesTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'history') renderSalesHistoryTab();
    else renderDailyRegisterTab();
}

async function renderSalesHistoryTab() {
    const holder = document.getElementById('salesTabContent');
    holder.innerHTML = `
        <div style="display:flex; gap:10px; margin-bottom:18px; align-items:center;">
            <div class="form-group" style="margin:0;"><input type="date" id="salesFrom" value="${daysAgoISO(30)}" style="padding:8px 12px; border:1.5px solid var(--border); border-radius:6px;" /></div>
            <span style="color:var(--text-muted);">to</span>
            <div class="form-group" style="margin:0;"><input type="date" id="salesTo" value="${todayISO()}" style="padding:8px 12px; border:1.5px solid var(--border); border-radius:6px;" /></div>
            <button class="btn btn-outline btn-sm" onclick="loadSalesTable()">Filter</button>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0;" id="salesTableHolder">
                <div class="loading-spinner" style="margin:40px auto;"></div>
            </div>
        </div>
    `;
    await loadSalesTable();
}

async function loadSalesTable() {
    const holder = document.getElementById('salesTableHolder');
    const from = document.getElementById('salesFrom').value;
    const to = document.getElementById('salesTo').value;
    const isCashier = Store.user.role === 'cashier';
    const canVoid = ['manager', 'super_admin'].includes(Store.user.role);

    try {
        const res = await Api.listSales(`?from=${from}&to=${to} 23:59:59`);
        const sales = res.sales;
        if (sales.length === 0) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">🧾</div><p>No sales in this period.</p></div>`;
            return;
        }
        holder.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Sale #</th><th>Date</th><th>Cashier</th><th>Total</th>
                        ${!isCashier ? '<th>Profit</th>' : ''}
                        <th>Payment</th><th>Status</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map(s => `
                        <tr>
                            <td><span style="font-family:var(--font-mono);font-size:12px;">${escapeHtml(s.sale_number)}</span></td>
                            <td>${formatDateTime(s.created_at)}</td>
                            <td>${escapeHtml(s.cashier_name)}</td>
                            <td>${formatMoney(s.total_amount)}</td>
                            ${!isCashier ? `<td style="color:${s.profit_amount >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatMoney(s.profit_amount)}</td>` : ''}
                            <td style="text-transform:capitalize;">${escapeHtml((s.payment_method || '').replace('_',' '))}</td>
                            <td>${statusBadge(s.status)}</td>
                            <td>
                                <button class="btn btn-outline btn-sm" onclick="viewSaleDetail(${s.id})">View</button>
                                ${canVoid && s.status === 'completed' ? `<button class="btn btn-danger btn-sm" onclick="handleVoidSale(${s.id})">Void</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        holder.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Failed to load sales.</p></div>`;
    }
}

/**
 * Daily Register - "who sold what today". Boss opens this and immediately
 * knows: total brought in today, who sold how much, and every single
 * item that left the shelf, attributed to a named cashier.
 */
async function renderDailyRegisterTab() {
    const holder = document.getElementById('salesTabContent');
    holder.innerHTML = `
        <div style="display:flex; gap:10px; margin-bottom:18px; align-items:center;">
            <div class="form-group" style="margin:0;">
                <input type="date" id="registerDate" value="${todayISO()}" max="${todayISO()}" style="padding:8px 12px; border:1.5px solid var(--border); border-radius:6px;" />
            </div>
            <button class="btn btn-outline btn-sm" onclick="loadDailyRegister()">View Day</button>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('registerDate').value='${todayISO()}'; loadDailyRegister();">Today</button>
        </div>
        <div id="registerContent"><div class="loading-spinner" style="margin:40px auto;"></div></div>
    `;
    await loadDailyRegister();
}

async function loadDailyRegister() {
    const content = document.getElementById('registerContent');
    const date = document.getElementById('registerDate').value || todayISO();

    try {
        const res = await Api.dailyRegister(date);
        const { lines, byCashier, voided, totals } = res;
        const isToday = date === todayISO();

        content.innerHTML = `
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-label">${isToday ? "Today's" : formatDate(date)} Total Sales</div>
                    <div class="kpi-value">${formatMoney(totals.totalSales)}</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">${totals.saleCount} transaction(s)</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Profit Earned</div>
                    <div class="kpi-value" style="color:${totals.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatMoney(totals.totalProfit)}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Discounts Given</div>
                    <div class="kpi-value">${formatMoney(totals.totalDiscount)}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Items Sold</div>
                    <div class="kpi-value">${lines.reduce((sum, l) => sum + parseFloat(l.quantity), 0)}</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">across ${lines.length} line(s)</div>
                </div>
            </div>

            <div class="card" style="margin-top:18px;">
                <div class="card-header"><h3>Sales by Cashier</h3></div>
                <div class="card-body" style="padding:0;">
                    ${byCashier.length === 0 ? `<div class="empty-state"><div class="icon">🧾</div><p>No sales recorded for this day.</p></div>` : `
                    <table>
                        <thead><tr><th>Cashier</th><th>Transactions</th><th>Total Sales</th><th>Profit</th></tr></thead>
                        <tbody>
                            ${byCashier.map(c => `
                                <tr>
                                    <td><strong>${escapeHtml(c.cashier_name)}</strong></td>
                                    <td>${c.sale_count}</td>
                                    <td>${formatMoney(c.total_sales)}</td>
                                    <td style="color:${c.total_profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatMoney(c.total_profit)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`}
                </div>
            </div>

            ${voided.length > 0 ? `
            <div class="card" style="margin-top:18px; border-color:var(--accent-red);">
                <div class="card-header"><h3 style="color:var(--accent-red);">⚠ Voided Sales (${voided.length})</h3></div>
                <div class="card-body" style="padding:0;">
                    <table>
                        <thead><tr><th>Sale #</th><th>Cashier</th><th>Amount</th><th>Time</th></tr></thead>
                        <tbody>
                            ${voided.map(v => `
                                <tr>
                                    <td><span style="font-family:var(--font-mono);font-size:12px;">${escapeHtml(v.sale_number)}</span></td>
                                    <td>${escapeHtml(v.cashier_name)}</td>
                                    <td>${formatMoney(v.total_amount)}</td>
                                    <td>${formatDateTime(v.created_at)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>` : ''}

            <div class="card" style="margin-top:18px;">
                <div class="card-header">
                    <h3>Every Item Sold ${isToday ? 'Today' : 'on ' + formatDate(date)}</h3>
                    <span class="badge badge-gray">${lines.length} line item(s)</span>
                </div>
                <div class="card-body" style="padding:0;">
                    ${lines.length === 0 ? `<div class="empty-state"><div class="icon">📦</div><p>Nothing sold yet for this day.</p></div>` : `
                    <table>
                        <thead><tr><th>Time</th><th>Product</th><th>Qty</th><th>Sold By</th><th>Amount</th><th>Profit</th><th>Sale #</th></tr></thead>
                        <tbody>
                            ${lines.map(l => `
                                <tr style="${l.status === 'voided' ? 'opacity:0.5;' : ''}">
                                    <td style="white-space:nowrap; font-size:12px;">${new Date(l.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td><strong>${escapeHtml(l.product_name)}</strong> <span style="color:var(--text-muted);font-size:11px;">${escapeHtml(l.product_code)}</span></td>
                                    <td>${l.quantity}</td>
                                    <td>${escapeHtml(l.cashier_name)}</td>
                                    <td>${formatMoney(l.line_total)}</td>
                                    <td style="color:${l.line_profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatMoney(l.line_profit)}</td>
                                    <td>
                                        <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">${escapeHtml(l.sale_number)}</span>
                                        ${l.status === 'voided' ? '<span class="badge badge-red" style="margin-left:6px;">voided</span>' : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`}
                </div>
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${escapeHtml(err.message || 'Failed to load daily register.')}</p></div>`;
    }
}

async function viewSaleDetail(saleId) {
    openModal(`<div class="modal"><div class="modal-body"><div class="loading-spinner" style="margin:30px auto;"></div></div></div>`);
    try {
        const res = await Api.getSale(saleId);
        const sale = res.sale;
        const items = res.items;
        const isCashier = Store.user.role === 'cashier';

        openModal(`
            <div class="modal">
                <div class="modal-header"><h3>Receipt — ${escapeHtml(sale.sale_number)}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
                <div class="modal-body">
                    <div style="font-size:12.5px; color:var(--text-secondary); margin-bottom:14px;">
                        ${formatDateTime(sale.created_at)} · Cashier: ${escapeHtml(sale.cashier_name)}
                    </div>
                    <table>
                        <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                        <tbody>
                            ${items.map(i => `
                                <tr>
                                    <td>${escapeHtml(i.product_name)}</td>
                                    <td>${i.quantity}</td>
                                    <td>${formatMoney(i.unit_price)}</td>
                                    <td>${formatMoney(i.line_total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="margin-top:16px; padding-top:14px; border-top:1.5px dashed var(--border);">
                        <div class="summary-row"><span>Subtotal</span><span>${formatMoney(sale.subtotal)}</span></div>
                        <div class="summary-row"><span>Discount</span><span>${formatMoney(sale.discount_amount)}</span></div>
                        <div class="summary-row"><span>Tax</span><span>${formatMoney(sale.tax_amount)}</span></div>
                        <div class="summary-row total"><span>Total</span><span>${formatMoney(sale.total_amount)}</span></div>
                        ${!isCashier ? `<div class="summary-row" style="color:var(--accent-green);"><span>Profit</span><span>${formatMoney(sale.profit_amount)}</span></div>` : ''}
                    </div>
                </div>
                <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Close</button></div>
            </div>
        `);
    } catch (err) {
        closeModal();
        showError(err);
    }
}

async function handleVoidSale(saleId) {
    if (!confirm('Void this sale? Stock will be restored and this action cannot be undone.')) return;
    try {
        await Api.voidSale(saleId);
        showToast('Sale voided and stock restored');
        loadSalesTable();
    } catch (err) {
        showError(err);
    }
}
