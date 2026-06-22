/* ============================================================
   Dashboard Page (Professional Edition)
   ============================================================ */

async function renderDashboardPage(container) {
    const isFinancial = ['super_admin', 'owner', 'manager', 'accountant', 'auditor'].includes(Store.user.role);

    const calls = [
        Api.dashboardSummary(),
        Api.lowStockAlerts().catch(() => ({ lowStock: [] })),
        Api.expiringAlerts().catch(() => ({ expiringSoon: [] }))
    ];
    if (isFinancial && Store.user.role !== 'auditor') {
        calls.push(Api.dashboardHealth().catch(() => null));
    }

    const [summaryRes, lowStockRes, expiringRes, healthRes] = await Promise.all(calls);

    const s = summaryRes.summary;
    const today = s.today, month = s.month;
    const health = healthRes?.health || null;

    const growthBadge = month.growthPercent != null
        ? `<span class="kpi-delta ${month.growthPercent >= 0 ? 'up' : 'down'}">${month.growthPercent >= 0 ? '▲' : '▼'} ${Math.abs(month.growthPercent)}% vs last month</span>`
        : '';

    container.innerHTML = `
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Today's Sales</div>
                <div class="kpi-value">${formatMoney(today.revenue)}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">${today.transactionCount} transaction(s)</div>
            </div>
            ${isFinancial ? `
            <div class="kpi-card">
                <div class="kpi-label">Today's Net Profit</div>
                <div class="kpi-value" style="color:${today.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatMoney(today.netProfit)}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">After expenses &amp; stock loss</div>
            </div>` : ''}
            <div class="kpi-card">
                <div class="kpi-label">This Month Revenue</div>
                <div class="kpi-value">${formatMoney(month.revenue)}</div>
                ${growthBadge}
            </div>
            ${isFinancial ? `
            <div class="kpi-card">
                <div class="kpi-label">This Month Net Profit</div>
                <div class="kpi-value" style="color:${month.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatMoney(month.netProfit)}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">${month.netProfit >= 0 ? 'Business is profitable this month' : 'Business is running at a loss'}</div>
            </div>` : ''}
        </div>

        ${isFinancial ? renderProfitLossBreakdown(month) : ''}

        ${health ? renderBusinessHealthPanel(health) : ''}

        <div style="display:grid; grid-template-columns: 1.6fr 1fr; gap:18px; margin-top:18px;" id="dashboardGrid">
            <div class="card">
                <div class="card-header"><h3>Sales Trend (30 Days)</h3></div>
                <div class="card-body" id="trendChartHolder">
                    <div class="loading-spinner"></div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Alerts</h3></div>
                <div class="card-body" style="display:flex; flex-direction:column; gap:14px;">
                    <div>
                        <div style="font-size:12px;font-weight:700;color:var(--accent-amber);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">⚠ Low Stock (${lowStockRes.lowStock.length})</div>
                        ${lowStockRes.lowStock.length === 0 ? '<p style="font-size:12.5px;color:var(--text-muted);">All stock levels healthy.</p>' :
                            lowStockRes.lowStock.slice(0, 5).map(p => `
                                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--surface-1);">
                                    <span>${escapeHtml(p.name)}</span>
                                    <span class="badge badge-amber">${p.total_stock} left</span>
                                </div>
                            `).join('')}
                    </div>
                    <div>
                        <div style="font-size:12px;font-weight:700;color:var(--accent-red);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">⏰ Expiring Soon (${expiringRes.expiringSoon.length})</div>
                        ${expiringRes.expiringSoon.length === 0 ? '<p style="font-size:12.5px;color:var(--text-muted);">No batches expiring soon.</p>' :
                            expiringRes.expiringSoon.slice(0, 5).map(b => `
                                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--surface-1);">
                                    <span>${escapeHtml(b.product_name)}</span>
                                    <span class="badge badge-red">${formatDate(b.expiry_date)}</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <div class="card" style="margin-top:18px;">
            <div class="card-header"><h3>Top Selling Products</h3></div>
            <div class="card-body" id="topProductsHolder"><div class="loading-spinner"></div></div>
        </div>
    `;

    renderTrendChart();
    renderTopProducts();
}

/**
 * Profit & Loss breakdown - shows the Boss exactly how Net Profit was
 * calculated, line by line, like a real accounting statement.
 * Revenue -> COGS -> Gross Profit -> Expenses -> Stock Loss -> Net Profit
 */
function renderProfitLossBreakdown(month) {
    const revenue = month.revenue || 0;
    const cogs = month.cogs || 0;
    const grossProfit = month.grossProfit || 0;
    const expenses = month.expenses || 0;
    const stockLoss = month.stockLoss || 0;
    const netProfit = month.netProfit || 0;
    const isProfitable = netProfit >= 0;

    const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : '0.0';
    const netMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0';

    const row = (label, value, opts = {}) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:11px 0; ${opts.border !== false ? 'border-bottom:1px solid var(--surface-1);' : ''}">
            <span style="font-size:13.5px; color:${opts.muted ? 'var(--text-secondary)' : 'var(--text-primary)'}; font-weight:${opts.bold ? '700' : '400'}; ${opts.indent ? 'padding-left:16px;' : ''}">${opts.icon ? opts.icon + ' ' : ''}${label}</span>
            <span style="font-family:var(--font-mono); font-size:${opts.bold ? '16px' : '13.5px'}; font-weight:${opts.bold ? '700' : '600'}; color:${opts.color || 'var(--text-primary)'};">${opts.negative ? '−' : ''}${formatMoney(Math.abs(value))}</span>
        </div>
    `;

    return `
        <div class="card" style="margin-top:18px;">
            <div class="card-header">
                <h3>Profit &amp; Loss — This Month</h3>
                <span class="badge ${isProfitable ? 'badge-green' : 'badge-red'}">${isProfitable ? 'Profitable' : 'Running at a Loss'}</span>
            </div>
            <div class="card-body">
                <div style="max-width:560px;">
                    ${row('Total Revenue (Sales)', revenue, { bold: false })}
                    ${row('Cost of Goods Sold (COGS)', cogs, { muted: true, negative: true, indent: true })}
                    ${row('Gross Profit', grossProfit, { bold: true, color: grossProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' })}
                    ${row('Operating Expenses (approved)', expenses, { muted: true, negative: true, indent: true })}
                    ${row('Stock Loss (damaged / expired)', stockLoss, { muted: true, negative: true, indent: true })}
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 0 4px; margin-top:4px; border-top:2px solid var(--primary-900);">
                        <span style="font-size:15px; font-weight:700;">Net Profit</span>
                        <span style="font-family:var(--font-mono); font-size:20px; font-weight:800; color:${isProfitable ? 'var(--accent-green)' : 'var(--accent-red)'};">${formatMoney(netProfit)}</span>
                    </div>
                </div>
                <div style="display:flex; gap:24px; margin-top:18px; padding-top:16px; border-top:1px solid var(--surface-2);">
                    <div>
                        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">Gross Margin</div>
                        <div style="font-size:18px; font-weight:700; margin-top:4px;">${grossMargin}%</div>
                    </div>
                    <div>
                        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">Net Margin</div>
                        <div style="font-size:18px; font-weight:700; margin-top:4px; color:${isProfitable ? 'var(--accent-green)' : 'var(--accent-red)'};">${netMargin}%</div>
                    </div>
                </div>
                ${!isProfitable ? `
                <div style="margin-top:16px; padding:12px 14px; background:var(--accent-red-bg); border-radius:var(--radius-sm); font-size:12.5px; color:var(--accent-red);">
                    ⚠ This month is currently running at a loss. Review expenses and stock loss below to identify the cause.
                </div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Business Health panel - the things an owner needs to glance at daily:
 * stock value tied up, money at risk from expiry, low stock, pending approvals.
 */
function renderBusinessHealthPanel(health) {
    const hasExpiredStock = health.alreadyExpired.batchCount > 0;
    const hasExpiringSoon = health.expiringSoon.batchCount > 0;

    return `
        <div class="card" style="margin-top:18px;">
            <div class="card-header">
                <h3>Business Health</h3>
                <button class="btn btn-outline btn-sm" onclick="window.__salesDefaultTab='register'; navigateTo('sales')">📋 Open Daily Register</button>
            </div>
            <div class="card-body">
                <div class="kpi-grid" style="margin-bottom:0;">
                    <div class="kpi-card" style="box-shadow:none; border-color:var(--surface-2);">
                        <div class="kpi-label">Stock Value (at cost)</div>
                        <div class="kpi-value" style="font-size:20px;">${formatMoney(health.stockValue)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">Sells for ${formatMoney(health.potentialRevenue)} if all moves</div>
                    </div>
                    <div class="kpi-card" style="box-shadow:none; border-color:${hasExpiredStock ? 'var(--accent-red)' : 'var(--surface-2)'};">
                        <div class="kpi-label">Already Expired (unsold)</div>
                        <div class="kpi-value" style="font-size:20px; color:${hasExpiredStock ? 'var(--accent-red)' : 'var(--text-primary)'};">${formatMoney(health.alreadyExpired.value)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">${health.alreadyExpired.batchCount} batch(es) need write-off</div>
                    </div>
                    <div class="kpi-card" style="box-shadow:none; border-color:${hasExpiringSoon ? 'var(--accent-amber)' : 'var(--surface-2)'};">
                        <div class="kpi-label">Value at Risk (expiring soon)</div>
                        <div class="kpi-value" style="font-size:20px; color:${hasExpiringSoon ? 'var(--accent-amber)' : 'var(--text-primary)'};">${formatMoney(health.expiringSoon.valueAtRisk)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">Within ${health.expiringSoon.alertWindowDays} days · ${health.expiringSoon.batchCount} batch(es)</div>
                    </div>
                    <div class="kpi-card" style="box-shadow:none; border-color:var(--surface-2);">
                        <div class="kpi-label">Lifetime Stock Loss</div>
                        <div class="kpi-value" style="font-size:20px;">${formatMoney(health.lifetimeStockLoss)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">All-time damaged + expired</div>
                    </div>
                </div>
                ${health.pendingExpenses.count > 0 ? `
                <div style="margin-top:16px; padding:12px 14px; background:var(--accent-blue-bg); border-radius:var(--radius-sm); font-size:12.5px; color:var(--accent-blue); display:flex; justify-content:space-between; align-items:center;">
                    <span>📝 ${health.pendingExpenses.count} expense(s) awaiting your approval</span>
                    <strong>${formatMoney(health.pendingExpenses.total)}</strong>
                </div>` : ''}
                ${health.noStockProducts && health.noStockProducts.length > 0 ? `
                <div style="margin-top:12px; padding:12px 14px; background:var(--accent-amber-bg); border-radius:var(--radius-sm); font-size:12.5px; color:var(--accent-amber);">
                    <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';">
                        <span>⚠ ${health.noStockProducts.length} product(s) have <strong>zero stock</strong> and won't appear in POS</span>
                        <span style="font-size:11px;">tap to view ▾</span>
                    </div>
                    <div style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid rgba(180,83,9,0.2);">
                        ${health.noStockProducts.map(p => `
                            <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px;">
                                <span>${escapeHtml(p.name)} <span style="color:var(--text-muted);">(${escapeHtml(p.product_code)})</span></span>
                            </div>
                        `).join('')}
                        <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="navigateTo('products')">Go Add Stock →</button>
                    </div>
                </div>` : ''}
            </div>
        </div>
    `;
}

async function renderTrendChart() {
    const holder = document.getElementById('trendChartHolder');
    try {
        const res = await Api.salesTrend(30);
        const trend = res.trend;
        if (trend.length === 0) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">📈</div><p>No sales recorded yet in this period.</p></div>`;
            return;
        }
        const max = Math.max(...trend.map(t => parseFloat(t.revenue)), 1);
        const bars = trend.map(t => {
            const h = Math.max((parseFloat(t.revenue) / max) * 140, 2);
            return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px;" title="${formatDate(t.date)}: ${formatMoney(t.revenue)}">
                <div style="width:100%; max-width:18px; height:${h}px; background:var(--accent-green); border-radius:3px 3px 0 0; opacity:0.85;"></div>
            </div>`;
        }).join('');
        holder.innerHTML = `<div style="display:flex; align-items:flex-end; gap:3px; height:160px;">${bars}</div>
            <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:11px; color:var(--text-muted);">
                <span>${formatDate(trend[0].date)}</span><span>${formatDate(trend[trend.length-1].date)}</span>
            </div>`;
    } catch (err) {
        holder.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">Could not load trend data.</p>`;
    }
}

async function renderTopProducts() {
    const holder = document.getElementById('topProductsHolder');
    try {
        const res = await Api.topProducts(8);
        const items = res.topProducts;
        if (items.length === 0) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>No sales data yet.</p></div>`;
            return;
        }
        holder.innerHTML = `
            <table>
                <thead><tr><th>Product</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                    ${items.map(p => `
                        <tr>
                            <td><strong>${escapeHtml(p.name)}</strong> <span style="color:var(--text-muted);font-size:11.5px;">${escapeHtml(p.product_code)}</span></td>
                            <td>${p.units_sold}</td>
                            <td>${formatMoney(p.revenue)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        holder.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">Could not load top products.</p>`;
    }
}

async function renderNotificationsPage(container) {
    container.innerHTML = loadingHtml();
    try {
        const res = await Api.notifications();
        const items = res.notifications;
        container.innerHTML = `
            <div class="card">
                <div class="card-header"><h3>Notifications</h3></div>
                <div class="card-body" style="padding:0;">
                    ${items.length === 0 ? `<div class="empty-state"><div class="icon">🔔</div><p>No notifications yet.</p></div>` :
                        items.map(n => `
                            <div style="display:flex; gap:14px; padding:16px 22px; border-bottom:1px solid var(--surface-1);">
                                <div style="width:8px;height:8px;border-radius:50%;margin-top:6px;flex-shrink:0;background:${n.severity === 'critical' ? 'var(--accent-red)' : n.severity === 'warning' ? 'var(--accent-amber)' : 'var(--accent-blue)'}"></div>
                                <div>
                                    <div style="font-weight:600;font-size:13.5px;">${escapeHtml(n.title)}</div>
                                    <div style="font-size:12.5px;color:var(--text-secondary);margin-top:3px;">${escapeHtml(n.message)}</div>
                                    <div style="font-size:11px;color:var(--text-muted);margin-top:5px;">${formatDateTime(n.created_at)}</div>
                                </div>
                            </div>
                        `).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Failed to load notifications.</p></div>`;
    }
}
