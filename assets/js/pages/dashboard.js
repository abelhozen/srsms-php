/* ============================================================
   Dashboard Page (Professional Edition)
   ============================================================ */

async function renderDashboardPage(container) {
    const isFinancial = ['super_admin', 'admin', 'owner'].includes(Store.user.role);

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
        ? `<span class="kpi-delta ${month.growthPercent >= 0 ? 'up' : 'down'}">${month.growthPercent >= 0 ? '▲' : '▼'} ${Math.abs(month.growthPercent)}% kuliko mwezi uliopita</span>`
        : '';

    container.innerHTML = `
        <section class="dashboard-hero">
            <div>
                <div class="hero-eyebrow"><i class="fa-solid fa-award"></i> ${escapeHtml(roleLabel(Store.user.role))} Kituo cha Uongozi</div>
                <h2>Utendaji wa duka kwa muonekano mmoja</h2>
                <p>Fuatilia mauzo, hisa, matumizi, na arifa katika eneo moja salama la kazi kwa duka linalokua.</p>
            </div>
            <div class="hero-actions">
                <button class="btn btn-dark" onclick="navigateTo('pos')"><i class="fa-solid fa-cash-register"></i> Mauzo Mpya</button>
                <button class="btn btn-outline" onclick="navigateTo('products')"><i class="fa-solid fa-boxes-stacked"></i> Dhibiti Hisa</button>
            </div>
        </section>

        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label"><i class="fa-solid fa-receipt"></i> Mauzo ya Leo</div>
                <div class="kpi-value">${formatMoney(today.revenue)}</div>
                <div class="metric-chip">${today.transactionCount} muamala ulioandikwa</div>
            </div>
            ${isFinancial ? `
            <div class="kpi-card">
                <div class="kpi-label"><i class="fa-solid fa-chart-line"></i> Faida ya Leo</div>
                <div class="kpi-value" style="color:${today.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatMoney(today.netProfit)}</div>
                <div class="metric-chip">Baada ya matumizi na hasara ya hisa</div>
            </div>` : ''}
            <div class="kpi-card">
                <div class="kpi-label"><i class="fa-solid fa-money-bill-trend-up"></i> Mapato ya Mwezi huu</div>
                <div class="kpi-value">${formatMoney(month.revenue)}</div>
                ${growthBadge}
            </div>
            ${isFinancial ? `
            <div class="kpi-card">
                <div class="kpi-label"><i class="fa-solid fa-scale-balanced"></i> Faida ya Mwezi huu</div>
                <div class="kpi-value" style="color:${month.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatMoney(month.netProfit)}</div>
                <div class="metric-chip">${month.netProfit >= 0 ? 'Utendaji wa faida mwezi huu' : 'Onyo la hasara linahitaji uangalizi'}</div>
            </div>` : ''}
        </div>

        ${isFinancial ? renderProfitLossBreakdown(month) : ''}

        ${health ? renderBusinessHealthPanel(health) : ''}

        <div class="dashboard-grid" id="dashboardGrid">
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-chart-column"></i> Mwelekeo wa Mauzo (Siku 30)</h3></div>
                <div class="card-body" id="trendChartHolder">
                    <div class="loading-spinner"></div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-bell"></i> Arifa za Muda Halisi</h3></div>
                <div class="card-body" style="display:flex; flex-direction:column; gap:14px;">
                    <div>
                        <div style="font-size:12px;font-weight:700;color:var(--accent-amber);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">⚠ Hisa Zisizokidhi Kiwango (${lowStockRes.lowStock.length})</div>
                        ${lowStockRes.lowStock.length === 0 ? '<p style="font-size:12.5px;color:var(--text-muted);">Hisa ziko katika hali nzuri.</p>' :
                            lowStockRes.lowStock.slice(0, 5).map(p => `
                                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--surface-1);">
                                    <span>${escapeHtml(p.name)}</span>
                                    <span class="badge badge-amber">${p.total_stock} zimesalia</span>
                                </div>
                            `).join('')}
                    </div>
                    <div>
                        <div style="font-size:12px;font-weight:700;color:var(--accent-red);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">⏰ Zina Karibia Kuisha Muda (${expiringRes.expiringSoon.length})</div>
                        ${expiringRes.expiringSoon.length === 0 ? '<p style="font-size:12.5px;color:var(--text-muted);">Hakuna batch zinazokaribia kuisha muda.</p>' :
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
            <div class="card-header"><h3><i class="fa-solid fa-boxes-stacked"></i> Bidhaa Zilizouzwa Sana</h3></div>
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
                <h3>Faida na Gharama — Mwezi huu</h3>
                <span class="badge ${isProfitable ? 'badge-green' : 'badge-red'}">${isProfitable ? 'Ina faida' : 'Ina hasara'}</span>
            </div>
            <div class="card-body">
                <div style="max-width:560px;">
                    ${row('Mapato ya Jumla (Mauzo)', revenue, { bold: false })}
                    ${row('Gharama ya Bidhaa Zilizouzwa (COGS)', cogs, { muted: true, negative: true, indent: true })}
                    ${row('Faida ya Kawaida', grossProfit, { bold: true, color: grossProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' })}
                    ${row('Matumizi ya Uendeshaji (yamekubaliwa)', expenses, { muted: true, negative: true, indent: true })}
                    ${row('Hasara ya Hisa (imeharibiwa / imemaliza muda)', stockLoss, { muted: true, negative: true, indent: true })}
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 0 4px; margin-top:4px; border-top:2px solid var(--primary-900);">
                        <span style="font-size:15px; font-weight:700;">Faida Halisi</span>
                        <span style="font-family:var(--font-mono); font-size:20px; font-weight:800; color:${isProfitable ? 'var(--accent-green)' : 'var(--accent-red)'};">${formatMoney(netProfit)}</span>
                    </div>
                </div>
                <div style="display:flex; gap:24px; margin-top:18px; padding-top:16px; border-top:1px solid var(--surface-2);">
                    <div>
                        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">Kiwango cha Faida ya Kawaida</div>
                        <div style="font-size:18px; font-weight:700; margin-top:4px;">${grossMargin}%</div>
                    </div>
                    <div>
                        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">Kiwango cha Faida Halisi</div>
                        <div style="font-size:18px; font-weight:700; margin-top:4px; color:${isProfitable ? 'var(--accent-green)' : 'var(--accent-red)'};">${netMargin}%</div>
                    </div>
                </div>
                ${!isProfitable ? `
                <div style="margin-top:16px; padding:12px 14px; background:var(--accent-red-bg); border-radius:var(--radius-sm); font-size:12.5px; color:var(--accent-red);">
                    ⚠ Mwezi huu una hasara. Angalia matumizi na hasara ya hisa ili kubaini chanzo.
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
                <h3>Afya ya Biashara</h3>
                <button class="btn btn-outline btn-sm" onclick="window.__salesDefaultTab='register'; navigateTo('sales')">📋 Fungua Rejesta ya Kila Siku</button>
            </div>
            <div class="card-body">
                <div class="kpi-grid" style="margin-bottom:0;">
                    <div class="kpi-card" style="box-shadow:none; border-color:var(--surface-2);">
                        <div class="kpi-label">Thamani ya Hisa (kwa gharama)</div>
                        <div class="kpi-value" style="font-size:20px;">${formatMoney(health.stockValue)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">Inauzwa kwa ${formatMoney(health.potentialRevenue)} ikiwa yote itahama</div>
                    </div>
                    <div class="kpi-card" style="box-shadow:none; border-color:${hasExpiredStock ? 'var(--accent-red)' : 'var(--surface-2)'};">
                        <div class="kpi-label">Imekwisha Muda (isiyouzwa)</div>
                        <div class="kpi-value" style="font-size:20px; color:${hasExpiredStock ? 'var(--accent-red)' : 'var(--text-primary)'};">${formatMoney(health.alreadyExpired.value)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">${health.alreadyExpired.batchCount} batch(z) zinahitaji kufutwa</div>
                    </div>
                    <div class="kpi-card" style="box-shadow:none; border-color:${hasExpiringSoon ? 'var(--accent-amber)' : 'var(--surface-2)'};">
                        <div class="kpi-label">Thamani Hatari (inakaribia kuisha muda)</div>
                        <div class="kpi-value" style="font-size:20px; color:${hasExpiringSoon ? 'var(--accent-amber)' : 'var(--text-primary)'};">${formatMoney(health.expiringSoon.valueAtRisk)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">Ndani ya siku ${health.expiringSoon.alertWindowDays} · ${health.expiringSoon.batchCount} batch(z)</div>
                    </div>
                    <div class="kpi-card" style="box-shadow:none; border-color:var(--surface-2);">
                        <div class="kpi-label">Hasara ya Hisa ya Maisha yote</div>
                        <div class="kpi-value" style="font-size:20px;">${formatMoney(health.lifetimeStockLoss)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">Zilizoharibiwa na zilizokwisha muda</div>
                    </div>
                </div>
                ${health.pendingExpenses.count > 0 ? `
                <div style="margin-top:16px; padding:12px 14px; background:var(--accent-blue-bg); border-radius:var(--radius-sm); font-size:12.5px; color:var(--accent-blue); display:flex; justify-content:space-between; align-items:center;">
                    <span>📝 ${health.pendingExpenses.count} matumizi yanasubiri uidhinishaji wako</span>
                    <strong>${formatMoney(health.pendingExpenses.total)}</strong>
                </div>` : ''}
                ${health.noStockProducts && health.noStockProducts.length > 0 ? `
                <div style="margin-top:12px; padding:12px 14px; background:var(--accent-amber-bg); border-radius:var(--radius-sm); font-size:12.5px; color:var(--accent-amber);">
                    <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';">
                        <span>⚠ ${health.noStockProducts.length} bidhaa zina <strong>hisa sifuri</strong> na hazitaonekana kwenye POS</span>
                        <span style="font-size:11px;">gusa kuona ▾</span>
                    </div>
                    <div style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid rgba(180,83,9,0.2);">
                        ${health.noStockProducts.map(p => `
                            <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px;">
                                <span>${escapeHtml(p.name)} <span style="color:var(--text-muted);">(${escapeHtml(p.product_code)})</span></span>
                            </div>
                        `).join('')}
                        <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="navigateTo('products')">Nenda Kuweka Hisa →</button>
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
            holder.innerHTML = `<div class="empty-state"><div class="icon">📈</div><p>Hakuna mauzo yaliyoandikwa bado katika kipindi hiki.</p></div>`;
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
        holder.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">Imeshindikana kupakia data ya mwenendo.</p>`;
    }
}

async function renderTopProducts() {
    const holder = document.getElementById('topProductsHolder');
    try {
        const res = await Api.topProducts(8);
        const items = res.topProducts;
        if (items.length === 0) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>Hakuna data ya mauzo bado.</p></div>`;
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
        holder.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">Imeshindikana kupakia bidhaa zilizouzwa sana.</p>`;
    }
}

async function renderNotificationsPage(container) {
    container.innerHTML = loadingHtml();
    try {
        const res = await Api.notifications();
        const items = res.notifications;
        container.innerHTML = `
            <div class="card">
                <div class="card-header"><h3>Arifa</h3></div>
                <div class="card-body" style="padding:0;">
                    ${items.length === 0 ? `<div class="empty-state"><div class="icon">🔔</div><p>Hakuna arifa bado.</p></div>` :
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
        container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Imeshindikana kupakia arifa.</p></div>`;
    }
}
