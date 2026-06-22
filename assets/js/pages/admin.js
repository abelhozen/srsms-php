/* ============================================================
   Audit Logs Page (Super Admin / Auditor)
   ============================================================ */

async function renderAuditPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3>System Audit Trail</h3></div>
            <div class="card-body" style="padding:0;" id="auditTableHolder">
                <div class="loading-spinner" style="margin:40px auto;"></div>
            </div>
        </div>
    `;
    try {
        const res = await Api.listAuditLogs();
        const logs = res.logs;
        const holder = document.getElementById('auditTableHolder');
        if (logs.length === 0) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>No audit records yet.</p></div>`;
            return;
        }
        holder.innerHTML = `
            <table>
                <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Description</th></tr></thead>
                <tbody>
                    ${logs.map(l => `
                        <tr>
                            <td style="white-space:nowrap;">${formatDateTime(l.created_at)}</td>
                            <td>${escapeHtml(l.user_name || 'System')}</td>
                            <td><span class="badge badge-gray">${escapeHtml(l.action)}</span></td>
                            <td>${escapeHtml(l.module || '-')}</td>
                            <td style="color:var(--text-secondary);">${escapeHtml(l.description || '-')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        document.getElementById('auditTableHolder').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Failed to load audit logs.</p></div>`;
    }
}

/* ============================================================
   System Settings Page (Super Admin only)
   ============================================================ */

async function renderSettingsPage(container) {
    container.innerHTML = `<div class="card"><div class="card-body"><div class="loading-spinner" style="margin:30px auto;"></div></div></div>`;
    try {
        const res = await Api.getSettings();
        const s = res.settings || {};
        container.innerHTML = `
            <div class="card" style="max-width:640px;">
                <div class="card-header"><h3>Shop Settings</h3></div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group"><label>Shop Name</label><input type="text" id="setShopName" value="${escapeHtml(s.shop_name || '')}" /></div>
                        <div class="form-group"><label>Currency</label><input type="text" id="setCurrency" value="${escapeHtml(s.currency || 'TZS')}" /></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Tax Rate (%)</label><input type="number" id="setTaxRate" value="${s.tax_rate || 0}" step="0.01" min="0" /></div>
                        <div class="form-group"><label>Phone</label><input type="text" id="setPhone" value="${escapeHtml(s.phone || '')}" /></div>
                    </div>
                    <div class="form-group"><label>Address</label><textarea id="setAddress" rows="2">${escapeHtml(s.address || '')}</textarea></div>
                    <div class="form-row">
                        <div class="form-group"><label>Low Stock Threshold</label><input type="number" id="setLowStock" value="${s.low_stock_threshold || 10}" min="0" /></div>
                        <div class="form-group"><label>Expiry Alert (days before)</label><input type="number" id="setExpiryDays" value="${s.expiry_alert_days || 30}" min="1" /></div>
                    </div>
                    <button class="btn btn-dark" onclick="submitUpdateSettings()" style="margin-top:8px;">Save Settings</button>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Failed to load settings.</p></div>`;
    }
}

async function submitUpdateSettings() {
    try {
        await Api.updateSettings({
            shopName: document.getElementById('setShopName').value.trim(),
            currency: document.getElementById('setCurrency').value.trim(),
            taxRate: parseFloat(document.getElementById('setTaxRate').value) || 0,
            phone: document.getElementById('setPhone').value.trim(),
            address: document.getElementById('setAddress').value.trim(),
            lowStockThreshold: parseInt(document.getElementById('setLowStock').value) || 10,
            expiryAlertDays: parseInt(document.getElementById('setExpiryDays').value) || 30
        });
        showToast('Settings updated successfully');
        window.__shopCurrency = document.getElementById('setCurrency').value.trim();
        setCurrency(window.__shopCurrency);
    } catch (err) {
        showError(err);
    }
}
