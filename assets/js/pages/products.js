/* ============================================================
   Products & Inventory Page
   ============================================================ */

// ---- Day / Month / Year date picker helper ----
// Builds three <select> dropdowns (Day, Month, Year) instead of a single
// calendar input, per request - easier to scan and less error-prone for
// staff entering expiry dates quickly during stock-in.

const MONTH_NAMES = ['Januari','Februari','Machi','Aprili','Mei','Juni','Julai','Agosti','Septemba','Oktoba','Novemba','Desemba'];

function buildDayMonthYearPicker(idPrefix, opts = {}) {
    const minYear = opts.minYear || new Date().getFullYear();
    const maxYear = opts.maxYear || (new Date().getFullYear() + 10);
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

    return `
        <div style="display:grid; grid-template-columns: 90px 1.4fr 100px; gap:8px;">
            <select id="${idPrefix}Day">
                <option value="">Siku</option>
                ${days.map(d => `<option value="${String(d).padStart(2,'0')}">${d}</option>`).join('')}
            </select>
            <select id="${idPrefix}Month">
                <option value="">Mwezi</option>
                ${MONTH_NAMES.map((m, i) => `<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('')}
            </select>
            <select id="${idPrefix}Year">
                <option value="">Mwaka</option>
                ${years.map(y => `<option value="${y}">${y}</option>`).join('')}
            </select>
        </div>
    `;
}

/** Reads the three selects and returns 'YYYY-MM-DD', or null if incomplete. */
function readDayMonthYearPicker(idPrefix) {
    const day = document.getElementById(`${idPrefix}Day`)?.value;
    const month = document.getElementById(`${idPrefix}Month`)?.value;
    const year = document.getElementById(`${idPrefix}Year`)?.value;
    if (!day || !month || !year) return null;
    return `${year}-${month}-${day}`;
}

/** Pre-fills a Day/Month/Year picker from an existing 'YYYY-MM-DD' value. */
function setDayMonthYearPicker(idPrefix, isoDate) {
    if (!isoDate) return;
    const [year, month, day] = isoDate.split('-');
    const dayEl = document.getElementById(`${idPrefix}Day`);
    const monthEl = document.getElementById(`${idPrefix}Month`);
    const yearEl = document.getElementById(`${idPrefix}Year`);
    if (dayEl) dayEl.value = day;
    if (monthEl) monthEl.value = month;
    if (yearEl) yearEl.value = year;
}

function ensureProductManagementAccess(productOwnerId = null) {
    const canManage = hasAnyRole(Store.user?.role, ['super_admin', 'admin', 'owner']) || Number(productOwnerId) === Number(Store.user.id);
    if (!canManage) {
        showError('Msimamizi, Mmiliki, au muundaji wa bidhaa tu ndio wanaweza kuhariri au kufuta bidhaa hii.');
        return false;
    }
    return true;
}

function ensureProductDeleteAccess() {
    if (!hasAnyRole(Store.user?.role, ['super_admin', 'admin', 'owner'])) {
        showError('Msimamizi au Mmiliki tu ndio wanaweza kufuta bidhaa.');
        return false;
    }
    return true;
}

async function renderProductsPage(container) {
    const canManageProducts = hasAnyRole(Store.user?.role, ['super_admin', 'admin', 'owner']);
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <div class="search-input">
                <span>🔍</span>
                <input type="text" id="productSearchInput" placeholder="Tafuta bidhaa..." />
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-outline" onclick="openManageCategoriesModal()">🏷 Dhibiti Kategoria</button>
                ${canManageProducts ? '<button class="btn btn-dark" onclick="openCreateProductModal()">+ Ongeza Bidhaa</button>' : ''}
            </div>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0;" id="productsTableHolder">
                <div class="loading-spinner" style="margin:40px auto;"></div>
            </div>
        </div>
    `;

    document.getElementById('productSearchInput').addEventListener('input', debounce(() => loadProductsTable(), 300));
    await loadProductsTable();
}

function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

async function loadProductsTable() {
    const holder = document.getElementById('productsTableHolder');
    const search = document.getElementById('productSearchInput')?.value || '';
    const canManageProducts = hasAnyRole(Store.user?.role, ['super_admin', 'admin', 'owner']);
    const canDeleteProducts = hasAnyRole(Store.user?.role, ['super_admin', 'admin', 'owner']);
    try {
        const res = await Api.listProducts(search ? `?search=${encodeURIComponent(search)}` : '');
        const products = res.products;
        if (products.length === 0) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>Hakuna bidhaa zilizopatikana. Ongeza bidhaa yako ya kwanza kuanza.</p></div>`;
            return;
        }
        holder.innerHTML = `
            <table>
                <thead><tr><th>Msimbo</th><th>Bidhaa</th><th>Kategoria</th><th>Hisa</th><th>Kuisha Muda Karibu</th><th>Hali</th><th></th></tr></thead>
                <tbody>
                    ${products.map(p => {
                        const noStock = parseFloat(p.total_stock) <= 0;
                        return `
                        <tr style="${noStock ? 'background:var(--accent-amber-bg);' : ''}">
                            <td><span style="font-family:var(--font-mono);font-size:12px;">${escapeHtml(p.product_code)}</span></td>
                            <td><strong>${escapeHtml(p.name)}</strong></td>
                            <td>${escapeHtml(p.category_name || '-')}</td>
                            <td>
                                ${noStock
                                    ? `<span class="badge badge-amber">⚠ Hakuna hisa — haiwezi kuuzwa bado</span>`
                                    : `${p.total_stock} ${escapeHtml(p.unit)}`}
                            </td>
                            <td>${p.nearest_expiry ? formatDate(p.nearest_expiry) : '-'}</td>
                            <td>${statusBadge(p.status)}</td>
                            <td style="white-space:nowrap;">
                                <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
                                    ${canManageProducts || Number(p.created_by) === Number(Store.user.id) ? `
                                        <button class="btn btn-outline btn-sm" onclick="openEditProductModal(${p.id}, '${escapeHtml(p.product_code).replace(/'/g, "\\'")}', '${escapeHtml(p.name).replace(/'/g, "\\'")}', ${p.category_id || 'null'}, '${escapeHtml(p.unit || 'pcs').replace(/'/g, "\\'")}', ${p.reorder_level || 10}, '${p.status || 'active'}', ${p.created_by || 'null'})">Hariri</button>
                                    ` : ''}
                                    ${canDeleteProducts ? `
                                        <button class="btn btn-danger btn-sm" onclick="handleDeleteProduct(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}', ${p.created_by || 'null'})">Futa</button>
                                    ` : ''}
                                    ${noStock
                                        ? `<button class="btn btn-green btn-sm" onclick="openProductDetail(${p.id})">+ Ongeza Hisa Sasa</button>`
                                        : `<button class="btn btn-outline btn-sm" onclick="openProductDetail(${p.id})">Angalia / Ongeza Batch</button>`}
                                </div>
                            </td>
                        </tr>
                    `;}).join('')}
                </tbody>
            </table>
            ${products.some(p => parseFloat(p.total_stock) <= 0) ? `
                <div style="padding:14px 22px; background:var(--accent-amber-bg); border-top:1px solid var(--surface-2); font-size:12.5px; color:var(--accent-amber);">
                    ⚠ Bidhaa zilizoangaziwa hapa juu zina <strong>hisa sifuri</strong> na <strong>hazitaonekana kwenye POS</strong> hadi uongeze batch. Bofya "+ Ongeza Hisa Sasa" kurekebisha hili.
                </div>
            ` : ''}
        `;
    } catch (err) {
        holder.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Imeshindikana kupakia bidhaa.</p></div>`;
    }
}

async function openCreateProductModal() {
    if (!ensureProductManagementAccess()) return;
    let categories = [];
    try { categories = (await Api.listCategories()).categories; } catch { /* ignore */ }

    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Ongeza Bidhaa Mpya</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group"><label>Msimbo wa Bidhaa</label><input type="text" id="npCode" placeholder="mf. PRD-001" /></div>
                    <div class="form-group"><label>Jina la Bidhaa</label><input type="text" id="npName" placeholder="mf. Mafuta ya Kupikia 1L" /></div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Category</label>
                        <select id="npCategory">
                            <option value="">-- None --</option>
                            ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Kiasi/Kifurushi</label><input type="text" id="npUnit" value="pcs" placeholder="pcs, kg, litre..." /></div>
                </div>
                <div class="form-group"><label>Kiwango cha Upya Kuweka Hisa (kikomo cha onyo)</label><input type="number" id="npReorder" value="10" min="0" /></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Ghairi</button>
                <button class="btn btn-dark" onclick="submitCreateProduct()">Hifadhi Bidhaa</button>
            </div>
        </div>
    `);
}

async function submitCreateProduct() {
    if (!ensureProductManagementAccess()) return;
    const productCode = document.getElementById('npCode').value.trim();
    const name = document.getElementById('npName').value.trim();
    const categoryId = document.getElementById('npCategory').value || null;
    const unit = document.getElementById('npUnit').value.trim() || 'pcs';
    const reorderLevel = parseInt(document.getElementById('npReorder').value) || 10;

    if (!productCode || !name) { showError('Msimbo wa bidhaa na jina vinahitajika'); return; }

    try {
        await Api.createProduct({ productCode, name, categoryId, unit, reorderLevel });
        showToast('Bidhaa imeundwa kwa mafanikio');
        closeModal();
        loadProductsTable();
    } catch (err) {
        showError(err);
    }
}

async function openEditProductModal(productId, productCode, name, categoryId, unit, reorderLevel, status, productOwnerId = null) {
    if (!ensureProductManagementAccess(productOwnerId)) return;
    let categories = [];
    try { categories = (await Api.listCategories()).categories; } catch { /* ignore */ }

    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Hariri Bidhaa</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group"><label>Msimbo wa Bidhaa</label><input type="text" id="epCode" value="${escapeHtml(productCode)}" /></div>
                    <div class="form-group"><label>Jina la Bidhaa</label><input type="text" id="epName" value="${escapeHtml(name)}" /></div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Category</label>
                        <select id="epCategory">
                            <option value="">-- None --</option>
                            ${categories.map(c => `<option value="${c.id}" ${Number(c.id) === Number(categoryId) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Kiasi/Kifurushi</label><input type="text" id="epUnit" value="${escapeHtml(unit)}" /></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Kiwango cha Upya Kuweka Hisa</label><input type="number" id="epReorder" value="${reorderLevel || 10}" min="0" /></div>
                    <div class="form-group"><label>Hali</label>
                        <select id="epStatus">
                            <option value="active" ${status === 'active' ? 'selected' : ''}>Inatumika</option>
                            <option value="inactive" ${status === 'inactive' ? 'selected' : ''}>Haijatumiwa</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Ghairi</button>
                <button class="btn btn-dark" onclick="submitEditProduct(${productId})">Hifadhi Mabadiliko</button>
            </div>
        </div>
    `);
}

async function submitEditProduct(productId) {
    if (!ensureProductManagementAccess()) return;
    try {
        await Api.updateProduct(productId, {
            productCode: document.getElementById('epCode').value.trim(),
            name: document.getElementById('epName').value.trim(),
            categoryId: document.getElementById('epCategory').value || null,
            unit: document.getElementById('epUnit').value.trim() || 'pcs',
            reorderLevel: parseInt(document.getElementById('epReorder').value) || 10,
            status: document.getElementById('epStatus').value
        });
        showToast('Bidhaa imeboreshwa kwa mafanikio');
        closeModal();
        loadProductsTable();
    } catch (err) {
        showError(err);
    }
}

async function handleDeleteProduct(productId, productName, productOwnerId = null) {
    if (!ensureProductDeleteAccess()) return;
    if (!confirm(`Futa "${productName}" kwenye hisa? Itatoweka kwenye Bidhaa na POS, na hisa iliyobaki itafutwa. Risiti za zamani zitasalia hadi historia ya mauzo ifutwe.`)) return;
    try {
        await Api.deleteProduct(productId);
        showToast('Bidhaa imezimwa kwa mafanikio');
        closeModal();
        loadProductsTable();
    } catch (err) {
        showError(err);
    }
}

async function openProductDetail(productId) {
    openModal(`<div class="modal"><div class="modal-body"><div class="loading-spinner" style="margin:30px auto;"></div></div></div>`);
    try {
        const res = await Api.getProduct(productId);
        const p = res.product;
        const batches = res.batches;
        const authorizedSellers = res.authorizedSellers || [];
        const isRestricted = Number(p.restrict_sellers) === 1;
        const canManageProducts = hasAnyRole(Store.user?.role, ['super_admin', 'admin', 'owner']) || Number(p.created_by) === Number(Store.user.id);
        const canDeleteProducts = hasAnyRole(Store.user?.role, ['super_admin', 'admin', 'owner']);

        openModal(`
            <div class="modal" style="max-width:720px;">
                <div class="modal-header">
                    <h3>${escapeHtml(p.name)}</h3>
                    <div style="display:flex; gap:8px; align-items:center;">
                        ${canManageProducts ? `
                            <button class="btn btn-outline btn-sm" onclick="openEditProductModal(${productId}, '${escapeHtml(p.product_code).replace(/'/g, "\\'")}', '${escapeHtml(p.name).replace(/'/g, "\\'")}', ${p.category_id || 'null'}, '${escapeHtml(p.unit || 'pcs').replace(/'/g, "\\'")}', ${p.reorder_level || 10}, '${p.status || 'active'}', ${p.created_by || 'null'})">Hariri</button>
                        ` : ''}
                        ${canDeleteProducts ? `
                            <button class="btn btn-danger btn-sm" onclick="handleDeleteProduct(${productId}, '${escapeHtml(p.name).replace(/'/g, "\\'")}', ${p.created_by || 'null'})">Futa</button>
                        ` : ''}
                        <button class="modal-close" onclick="closeModal()">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div style="display:flex; gap:20px; margin-bottom:18px; font-size:13px; color:var(--text-secondary);">
                        <span><strong>Msimbo:</strong> ${escapeHtml(p.product_code)}</span>
                        <span><strong>Kiasi/Kifurushi:</strong> ${escapeHtml(p.unit)}</span>
                        <span><strong>Kategoria:</strong> ${escapeHtml(p.category_name || '-')}</span>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding:12px 14px; background:${isRestricted ? 'var(--accent-amber-bg)' : 'var(--surface-1)'}; border-radius:var(--radius-sm);">
                        <div>
                            <div style="font-size:12.5px; font-weight:600; color:${isRestricted ? 'var(--accent-amber)' : 'var(--text-secondary)'};">
                                ${isRestricted ? `🔒 Imepunguzwa — ${authorizedSellers.length} muuzaji/wauzaji walioidhinishwa tu` : '🔓 Mkasishaji yeyote anaweza kuuza bidhaa hii'}
                            </div>
                            ${isRestricted && authorizedSellers.length > 0 ? `
                                <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                                    ${authorizedSellers.map(s => escapeHtml(s.full_name)).join(', ')}
                                </div>` : ''}
                        </div>
                        <button class="btn btn-outline btn-sm" onclick="openManageSellersModal(${productId}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">Dhibiti Wauzaji</button>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h4 style="font-family:var(--font-display); font-size:14px;">Batch</h4>
                        <button class="btn btn-green btn-sm" onclick="openAddBatchModal(${productId}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">+ Ongeza Batch</button>
                    </div>
                    <div style="max-height:320px; overflow-y:auto;">
                        <table>
                            <thead><tr><th>Batch #</th><th>Kiasi Kilichobaki</th><th>Bei ya Kununua</th><th>Bei ya Kuuza</th><th>Muda wa Kuisha</th><th>Hali</th><th></th></tr></thead>
                            <tbody>
                                ${batches.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Hakuna batch bado. Ongeza hisa kuanza kuuza bidhaa hii.</td></tr>` :
                                    batches.map(b => `
                                        <tr>
                                            <td>${escapeHtml(b.batch_number)}</td>
                                            <td>${b.quantity_remaining}</td>
                                            <td>${formatMoney(b.buying_price)}</td>
                                            <td>${formatMoney(b.selling_price)}</td>
                                            <td>${b.expiry_date ? formatDate(b.expiry_date) : '<span style="color:var(--text-muted);">Hakuna mwisho wa muda</span>'}</td>
                                            <td>${statusBadge(b.status)}</td>
                                            <td>
                                                ${b.status === 'active' ? `<button class="btn btn-sm btn-danger" onclick="markBatchDamaged(${b.id}, ${productId}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">Weka Imeharibika</button>` : ''}
                                            </td>
                                        </tr>
                                    `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Funga</button></div>
            </div>
        `);
    } catch (err) {
        closeModal();
        showError(err);
    }
}

function openAddBatchModal(productId, productName) {
    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Add Batch — ${escapeHtml(productName)}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group"><label>Namba ya Batch</label><input type="text" id="nbNumber" placeholder="mf. BATCH-2026-06" /></div>
                    <div class="form-group"><label>Kiasi Kilichopokelewa</label><input type="number" id="nbQty" min="1" /></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Bei ya Kununua (kwa kila kitengo)</label><input type="number" id="nbBuy" min="0" step="0.01" /></div>
                    <div class="form-group"><label>Bei ya Kuuza (kwa kila kitengo)</label><input type="number" id="nbSell" min="0" step="0.01" /></div>
                </div>

                <div class="form-group">
                    <label>Tarehe ya Kupokelewa</label>
                    ${buildDayMonthYearPicker('nbReceived', { minYear: new Date().getFullYear() - 1, maxYear: new Date().getFullYear() })}
                </div>

                <div style="margin-top:6px; padding-top:14px; border-top:1px solid var(--surface-2);">
                    <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--text-primary); text-transform:none; letter-spacing:0; cursor:pointer; margin-bottom:0;">
                        <input type="checkbox" id="nbNoExpiry" style="width:16px; height:16px;" onchange="toggleExpiryField()" />
                        Bidhaa hii haina muda wa kuisha (mf. vyombo, nguo, vifaa vya elektroniki)
                    </label>
                </div>

                <div class="form-group" id="nbExpiryWrapper" style="margin-top:14px;">
                    <label>Tarehe ya Kuisha Muda <span style="color:var(--accent-red);">*</span></label>
                    ${buildDayMonthYearPicker('nbExpiry', { minYear: new Date().getFullYear(), maxYear: new Date().getFullYear() + 10 })}
                    <p style="font-size:11.5px; color:var(--text-muted); margin-top:6px;">Inahitajika kwa kila batch isipokuwa ikitimba "haina muda wa kuisha" hapo juu.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="openProductDetail(${productId})">Rudi</button>
                <button class="btn btn-dark" id="nbSubmitBtn" onclick="submitAddBatch(${productId})">Ongeza Batch</button>
            </div>
        </div>
    `);

    setDayMonthYearPicker('nbReceived', todayISO());
}

function toggleExpiryField() {
    const noExpiry = document.getElementById('nbNoExpiry').checked;
    const wrapper = document.getElementById('nbExpiryWrapper');
    wrapper.style.display = noExpiry ? 'none' : 'block';
    if (noExpiry) {
        ['nbExpiryDay', 'nbExpiryMonth', 'nbExpiryYear'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }
}

async function submitAddBatch(productId, confirmLowPrice = false) {
    const batchNumber = document.getElementById('nbNumber').value.trim();
    const quantity = parseFloat(document.getElementById('nbQty').value);
    const buyingPrice = parseFloat(document.getElementById('nbBuy').value);
    const sellingPrice = parseFloat(document.getElementById('nbSell').value);
    const receivedDate = readDayMonthYearPicker('nbReceived');
    const hasExpiry = !document.getElementById('nbNoExpiry').checked;
    const expiryDate = hasExpiry ? readDayMonthYearPicker('nbExpiry') : null;

    if (!batchNumber || !quantity || isNaN(buyingPrice) || isNaN(sellingPrice)) {
        showError('Tafadhali jaza namba ya batch, kiasi, bei ya kununua na bei ya kuuza');
        return;
    }
    if (!receivedDate) {
        showError('Tafadhali chagua tarehe ya kupokelewa (siku, mwezi, na mwaka)');
        return;
    }
    if (hasExpiry && !expiryDate) {
        showError('Tafadhali chagua tarehe kamili ya kuisha muda (siku, mwezi, na mwaka), au weka tiki "Bidhaa hii haina muda wa kuisha"');
        return;
    }

    const btn = document.getElementById('nbSubmitBtn');
    btn.disabled = true;

    try {
        await Api.addBatch(productId, {
            batchNumber, quantity, buyingPrice, sellingPrice, receivedDate,
            hasExpiry, expiryDate, confirmLowPrice
        });
        showToast('Batch imeongezwa kwa mafanikio');
        openProductDetail(productId);
        loadProductsTable();
    } catch (err) {
        if (err?.data?.warning === 'price_below_cost') {
            const proceed = confirm(`${err.message}\n\nUnataka kuhifadhi batch hii hata hivyo kwa bei ya hasara?`);
            if (proceed) {
                btn.disabled = false;
                return submitAddBatch(productId, true);
            }
        } else {
            showError(err);
        }
    } finally {
        btn.disabled = false;
    }
}

// ---- Authorized Sellers ----

async function openManageSellersModal(productId, productName) {
    openModal(`<div class="modal"><div class="modal-body"><div class="loading-spinner" style="margin:30px auto;"></div></div></div>`);

    try {
        const [productRes, usersRes] = await Promise.all([
            Api.getProduct(productId),
            Api.listUsers()
        ]);

        const isRestricted = Number(productRes.product.restrict_sellers) === 1;
        const authorizedIds = new Set((productRes.authorizedSellers || []).map(s => s.id));
        // Only cashiers (and admins, who can always sell anyway) make sense as "sellers"
        const sellers = usersRes.users.filter(u => u.role_name === 'cashier' && u.status === 'active');

        openModal(`
            <div class="modal">
                <div class="modal-header"><h3>Nani Anaweza Kuuza — ${escapeHtml(productName)}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
                <div class="modal-body">
                    <label style="display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:600; color:var(--text-primary); text-transform:none; letter-spacing:0; cursor:pointer; margin-bottom:16px;">
                        <input type="checkbox" id="msRestrict" style="width:16px; height:16px;" ${isRestricted ? 'checked' : ''} onchange="toggleSellerList()" />
                        Zuia nani anaweza kuuza bidhaa hii
                    </label>
                    <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">By default, any cashier can sell any product. Turn this on for items that need special authorization (e.g. high-value goods, age-restricted items).</p>

                    <div id="msSellerList" style="${isRestricted ? '' : 'display:none;'} border-top:1px solid var(--surface-2); padding-top:14px;">
                        <label style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.03em; margin-bottom:10px; display:block;">Wauzaji Waliodhibitiwa</label>
                        ${sellers.length === 0 ? `<p style="font-size:12.5px; color:var(--text-muted);">Hakuna makasishaji wanaofanya kazi. Ongeza akaunti ya mkasishaji kwanza chini ya Watumiaji.</p>` :
                            sellers.map(s => `
                                <label style="display:flex; align-items:center; gap:10px; padding:8px 0; font-size:13.5px; font-weight:400; text-transform:none; letter-spacing:0; cursor:pointer;">
                                    <input type="checkbox" class="ms-seller-checkbox" value="${s.id}" ${authorizedIds.has(s.id) ? 'checked' : ''} style="width:16px; height:16px;" />
                                    ${escapeHtml(s.full_name)} <span style="color:var(--text-muted);">(${escapeHtml(s.username)})</span>
                                </label>
                            `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="openProductDetail(${productId})">Rudi</button>
                    <button class="btn btn-dark" onclick="submitManageSellers(${productId})">Hifadhi</button>
                </div>
            </div>
        `);
    } catch (err) {
        closeModal();
        showError(err);
    }
}

function toggleSellerList() {
    const restrict = document.getElementById('msRestrict').checked;
    document.getElementById('msSellerList').style.display = restrict ? 'block' : 'none';
}

async function submitManageSellers(productId) {
    const restrictSellers = document.getElementById('msRestrict').checked;
    const sellerIds = Array.from(document.querySelectorAll('.ms-seller-checkbox:checked')).map(el => parseInt(el.value));

    if (restrictSellers && sellerIds.length === 0) {
        showError('Chagua angalau mkasishaji mmoja, au uzime kizuizi');
        return;
    }

    try {
        await Api.updateProductSellers(productId, { restrictSellers, sellerIds });
        showToast('Wauzaji waliodhibitiwa wamesasishwa');
        openProductDetail(productId);
    } catch (err) {
        showError(err);
    }
}

async function markBatchDamaged(batchId, productId, productName) {
    if (!confirm(`Weka batch hii ya "${productName}" kama imeharibika? Hii itafuta hisa iliyobaki na kurekodi hasara.`)) return;
    try {
        await Api.updateBatchStatus(batchId, 'damaged', 'Marked damaged via inventory screen');
        showToast('Batch imewekwa kama imeharibika');
        openProductDetail(productId);
        loadProductsTable();
    } catch (err) {
        showError(err);
    }
}

// ---- Product Categories ----

async function openManageCategoriesModal() {
    openModal(`<div class="modal"><div class="modal-body"><div class="loading-spinner" style="margin:30px auto;"></div></div></div>`);
    await renderManageCategoriesModal();
}

async function renderManageCategoriesModal() {
    let categories = [];
    try {
        categories = (await Api.listCategories()).categories;
    } catch (err) {
        closeModal();
        showError(err);
        return;
    }

    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Kategoria za Bidhaa</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div style="max-height:280px; overflow-y:auto; margin-bottom:18px;">
                    <table>
                        <thead><tr><th>Name</th><th>Description</th></tr></thead>
                        <tbody>
                            ${categories.length === 0 ? `<tr><td colspan="2" style="text-align:center;color:var(--text-muted);padding:20px;">Hakuna kategoria bado. Ongeza moja hapa chini.</td></tr>` :
                                categories.map(c => `
                                    <tr>
                                        <td><strong>${escapeHtml(c.name)}</strong></td>
                                        <td>${escapeHtml(c.description || '-')}</td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="border-top:1px solid var(--surface-2); padding-top:16px;">
                    <h4 style="font-family:var(--font-display); font-size:14px; margin-bottom:12px;">Ongeza Kategoria Mpya</h4>
                    <div class="form-group"><label>Jina la Kategoria</label><input type="text" id="ncatName" placeholder="mf. Vinywaji" /></div>
                    <div class="form-group"><label>Maelezo (si lazima)</label><input type="text" id="ncatDescription" placeholder="mf. Vinywaji baridi, juisi, maji" /></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Funga</button>
                <button class="btn btn-dark" onclick="submitCreateCategory()">Ongeza Kategoria</button>
            </div>
        </div>
    `);
}

async function submitCreateCategory() {
    const name = document.getElementById('ncatName').value.trim();
    const description = document.getElementById('ncatDescription').value.trim();
    if (!name) { showError('Jina la kategoria linahitajika'); return; }

    try {
        await Api.createCategory({ name, description });
        showToast('Kategoria imeongezwa kwa mafanikio');
        await renderManageCategoriesModal();
    } catch (err) {
        showError(err);
    }
}
