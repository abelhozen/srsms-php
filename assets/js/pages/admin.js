/* ============================================================
   Audit Logs Page (Super Admin / Auditor)
   ============================================================ */

async function renderAuditPage(container) {
    if (!['super_admin', 'admin', 'owner', 'auditor'].includes(Store.user.role)) {
        container.innerHTML = `<div class="empty-state"><div class="icon">🔒</div><p>Huna ufikiaji wa kumbukumbu za ukaguzi.</p></div>`;
        return;
    }

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:16px;">
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                <input type="date" id="auditFrom" style="padding:8px 12px; border:1.5px solid var(--border); border-radius:6px;" />
                <span style="color:var(--text-muted);">to</span>
                <input type="date" id="auditTo" style="padding:8px 12px; border:1.5px solid var(--border); border-radius:6px;" />
                <input type="text" id="auditAction" placeholder="Kitendo..." style="padding:8px 12px; border:1.5px solid var(--border); border-radius:6px; min-width:180px;" />
                <select id="auditLimit" style="padding:8px 12px; border:1.5px solid var(--border); border-radius:6px;">
                    <option value="100">100</option>
                    <option value="150" selected>150</option>
                    <option value="300">300</option>
                    <option value="500">500</option>
                </select>
                <button class="btn btn-outline btn-sm" onclick="loadAuditLogs()">Chuja</button>
            </div>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('auditFrom').value='';document.getElementById('auditTo').value='';document.getElementById('auditAction').value='';loadAuditLogs();">Weka upya</button>
        </div>
        <div class="card">
            <div class="card-header"><h3>System Audit Trail</h3></div>
            <div class="card-body" style="padding:0;" id="auditTableHolder">
                <div class="loading-spinner" style="margin:40px auto;"></div>
            </div>
        </div>
    `;
    await loadAuditLogs();
}

async function loadAuditLogs() {
    const holder = document.getElementById('auditTableHolder');
    if (!holder) return;
    holder.innerHTML = `<div class="loading-spinner" style="margin:40px auto;"></div>`;

    const params = new URLSearchParams();
    const from = document.getElementById('auditFrom')?.value;
    const to = document.getElementById('auditTo')?.value;
    const action = document.getElementById('auditAction')?.value.trim();
    const limit = document.getElementById('auditLimit')?.value || '150';
    if (from) params.set('from', from);
    if (to) params.set('to', `${to} 23:59:59`);
    if (action) params.set('action', action);
    params.set('limit', limit);

    try {
        const res = await Api.listAuditLogs(`?${params.toString()}`);
        const logs = res.logs || [];
        if (logs.length === 0) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>Hakuna rekodi za ukaguzi zilizopatikana.</p></div>`;
            return;
        }
        holder.innerHTML = `
            <table>
                <thead><tr><th>Muda</th><th>Mtumiaji</th><th>Kitendo</th><th>Moduli</th><th>IP</th><th>Maelezo</th></tr></thead>
                <tbody>
                    ${logs.map(l => `
                        <tr>
                            <td style="white-space:nowrap;">${formatDateTime(l.created_at)}</td>
                            <td>${escapeHtml(l.user_name || 'System')}</td>
                            <td><span class="badge badge-gray">${escapeHtml(l.action)}</span></td>
                            <td>${escapeHtml(l.module || '-')}</td>
                            <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);">${escapeHtml(l.ip_address || '-')}</td>
                            <td style="color:var(--text-secondary);">${escapeHtml(l.description || '-')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        holder.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Imeshindikana kupakia kumbukumbu za ukaguzi.</p></div>`;
    }
}

/* ============================================================
   System Settings Page (Super Admin only)
   ============================================================ */

async function renderSettingsPage(container) {
    if (!['super_admin', 'admin', 'owner'].includes(Store.user.role)) {
        container.innerHTML = `<div class="empty-state"><div class="icon">🔒</div><p>Huna ufikiaji wa mipangilio ya mfumo.</p></div>`;
        return;
    }

    const canManageSettings = ['super_admin', 'admin', 'owner'].includes(Store.user.role);
    container.innerHTML = `<div class="card"><div class="card-body"><div class="loading-spinner" style="margin:30px auto;"></div></div></div>`;
    try {
        const [settingsRes, healthRes] = await Promise.all([
            Api.getSettings(),
            Api.systemHealth().catch(() => ({ health: null }))
        ]);
        const res = settingsRes;
        const s = res.settings || {};
        const h = healthRes.health;
        container.innerHTML = `
            ${h ? `
            <div class="kpi-grid" style="margin-bottom:18px;">
                <div class="kpi-card"><div class="kpi-label">DB Response</div><div class="kpi-value" style="font-size:22px;">${h.dbLatencyMs} ms</div></div>
                <div class="kpi-card"><div class="kpi-label">Active Products</div><div class="kpi-value" style="font-size:22px;">${h.activeProducts}</div></div>
                <div class="kpi-card"><div class="kpi-label">Today's Sales</div><div class="kpi-value" style="font-size:22px;">${h.todaySales}</div></div>
                <div class="kpi-card"><div class="kpi-label">Low Stock</div><div class="kpi-value" style="font-size:22px;color:${h.lowStockProducts > 0 ? 'var(--accent-amber)' : 'var(--text-primary)'};">${h.lowStockProducts}</div></div>
            </div>` : ''}

            <div class="settings-grid">
                <div class="card">
                    <div class="card-header"><h3>Wasifu wa Biashara</h3></div>
                    <div class="card-body">
                        <div class="form-row">
                            <div class="form-group"><label>Jina la Duka</label><input type="text" id="setShopName" value="${escapeHtml(s.shop_name || '')}" ${canManageSettings ? '' : 'disabled'} /></div>
                            <div class="form-group"><label>Fedha</label><input type="text" id="setCurrency" value="${escapeHtml(s.currency || 'TZS')}" maxlength="10" ${canManageSettings ? '' : 'disabled'} /></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Kiwango cha Kodi (%)</label><input type="number" id="setTaxRate" value="${s.tax_rate || 0}" step="0.01" min="0" max="100" ${canManageSettings ? '' : 'disabled'} /></div>
                            <div class="form-group"><label>Simu</label><input type="text" id="setPhone" value="${escapeHtml(s.phone || '')}" ${canManageSettings ? '' : 'disabled'} /></div>
                        </div>
                        <div class="form-group"><label>Anwani</label><textarea id="setAddress" rows="3" ${canManageSettings ? '' : 'disabled'}>${escapeHtml(s.address || '')}</textarea></div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><h3>Arifa za Hisa</h3></div>
                    <div class="card-body">
                        <div class="form-row">
                            <div class="form-group"><label>Kikomo cha Hisa Chache</label><input type="number" id="setLowStock" value="${s.low_stock_threshold || 10}" min="0" ${canManageSettings ? '' : 'disabled'} /></div>
                            <div class="form-group"><label>Siku za Arifa ya Muda wa Kuisha</label><input type="number" id="setExpiryDays" value="${s.expiry_alert_days || 30}" min="1" max="3650" ${canManageSettings ? '' : 'disabled'} /></div>
                        </div>
                        <div style="display:grid; gap:10px; margin-top:8px;">
                            <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:var(--text-secondary);">Batch zenye hisa kwenye stok</span><strong>${h ? h.activeBatches : '-'}</strong></div>
                            <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:var(--text-secondary);">Matumizi yanayosubiri</span><strong>${h ? h.pendingExpenses : '-'}</strong></div>
                            <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:var(--text-secondary);">Sasisha mwisho wa mipangilio</span><strong>${h?.settingsUpdatedAt ? formatDateTime(h.settingsUpdatedAt) : '-'}</strong></div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><h3>Vidhibiti vya Msimamizi</h3></div>
                    <div class="card-body">
                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                            ${canManageSettings ? `<button class="btn btn-dark" onclick="submitUpdateSettings()">Hifadhi Mipangilio</button>` : ''}
                            <button class="btn btn-outline" onclick="navigateTo('audit')">Fungua Rekodi za Ukaguzi</button>
                            <button class="btn btn-outline" onclick="renderSettingsPage(document.getElementById('pageBody'))">Onyesha Upya Afya</button>
                        </div>
                        <p style="margin-top:14px;color:var(--text-muted);font-size:12.5px;">For database speed on existing installations, run <span style="font-family:var(--font-mono);">database/performance_indexes.sql</span> once in MySQL/phpMyAdmin.</p>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><h3>Chelezo na Kurudisha</h3></div>
                    <div class="card-body">
                        <div class="form-row">
                            <div class="form-group" style="min-width:260px;">
                                <label>Ushikaji wa chelezo</label>
                                <select id="setBackupRetention" ${canManageSettings ? '' : 'disabled'}>
                                    <option value="day" ${s.backup_retention_period === 'day' ? 'selected' : ''}>Siku 1</option>
                                    <option value="week" ${s.backup_retention_period === 'week' ? 'selected' : ''}>Wiki 1</option>
                                    <option value="month" ${s.backup_retention_period === 'month' ? 'selected' : ''}>Mwezi 1</option>
                                    <option value="year" ${s.backup_retention_period === 'year' ? 'selected' : ''}>Mwaka 1</option>
                                </select>
                            </div>
                        </div>

                        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; align-items:center;">
                            ${canManageSettings ? `<button class="btn btn-dark" onclick="createBackupNow()">Unda Chelezo Sasa</button>` : ''}
                            <button class="btn btn-outline" onclick="loadBackupList()">Onyesha Upya Orodha ya Chelezo</button>
                        </div>

                        <div id="backupListHolder" style="margin-top:14px;">
                            <div class="loading-spinner" style="margin:20px auto;"></div>
                        </div>

                        <p style="margin-top:12px;color:var(--text-muted);font-size:12px;">
                            Chelezo huhifadhiwa kwenye seva na zinaweza kupakuliwa na Msimamizi.
                            Chelezo za zamani zitasafishwa kulingana na muda wa kuhifadhi.
                        </p>
                    </div>
                </div>


                <div class="card">
                    <div class="card-header"><h3>Muhtasari wa Kumbukumbu ya Mfumo</h3></div>
                    <div class="card-body">
                        <div style="display:grid; gap:10px;">
                            <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:var(--text-secondary);">Rekodi za ukaguzi</span><strong>${h ? h.auditRecords : '-'}</strong></div>
                            <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:var(--text-secondary);">Kumbukumbu ya mwisho</span><strong>${h?.lastAuditAt ? formatDateTime(h.lastAuditAt) : '-'}</strong></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Imeshindikana kupakia mipangilio.</p></div>`;
    }

    // Load backup list if card exists
    try { if (typeof loadBackupList === 'function') loadBackupList(); } catch { /* ignore */ }
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
            expiryAlertDays: parseInt(document.getElementById('setExpiryDays').value) || 30,
            backupRetentionPeriod: document.getElementById('setBackupRetention')?.value
        });

        showToast('Mipangilio imehifadhiwa kwa mafanikio');
        window.__shopCurrency = document.getElementById('setCurrency').value.trim();
        setCurrency(window.__shopCurrency);
    } catch (err) {
        showError(err);
    }
}
