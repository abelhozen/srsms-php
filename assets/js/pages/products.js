/* ============================================================
   Products & Inventory Page
   ============================================================ */

// ---- Day / Month / Year date picker helper ----
// Builds three <select> dropdowns (Day, Month, Year) instead of a single
// calendar input, per request - easier to scan and less error-prone for
// staff entering expiry dates quickly during stock-in.

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function buildDayMonthYearPicker(idPrefix, opts = {}) {
    const minYear = opts.minYear || new Date().getFullYear();
    const maxYear = opts.maxYear || (new Date().getFullYear() + 10);
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

    return `
        <div style="display:grid; grid-template-columns: 90px 1.4fr 100px; gap:8px;">
            <select id="${idPrefix}Day">
                <option value="">Day</option>
                ${days.map(d => `<option value="${String(d).padStart(2,'0')}">${d}</option>`).join('')}
            </select>
            <select id="${idPrefix}Month">
                <option value="">Month</option>
                ${MONTH_NAMES.map((m, i) => `<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('')}
            </select>
            <select id="${idPrefix}Year">
                <option value="">Year</option>
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

async function renderProductsPage(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <div class="search-input">
                <span>🔍</span>
                <input type="text" id="productSearchInput" placeholder="Search products..." />
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-outline" onclick="openManageCategoriesModal()">🏷 Manage Categories</button>
                <button class="btn btn-dark" onclick="openCreateProductModal()">+ Add Product</button>
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
    try {
        const res = await Api.listProducts(search ? `?search=${encodeURIComponent(search)}` : '');
        const products = res.products;
        if (products.length === 0) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>No products found. Add your first product to get started.</p></div>`;
            return;
        }
        holder.innerHTML = `
            <table>
                <thead><tr><th>Code</th><th>Product</th><th>Category</th><th>Stock</th><th>Nearest Expiry</th><th>Status</th><th></th></tr></thead>
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
                                    ? `<span class="badge badge-amber">⚠ No stock — cannot sell yet</span>`
                                    : `${p.total_stock} ${escapeHtml(p.unit)}`}
                            </td>
                            <td>${p.nearest_expiry ? formatDate(p.nearest_expiry) : '-'}</td>
                            <td>${statusBadge(p.status)}</td>
                            <td>
                                ${noStock
                                    ? `<button class="btn btn-green btn-sm" onclick="openProductDetail(${p.id})">+ Add Stock Now</button>`
                                    : `<button class="btn btn-outline btn-sm" onclick="openProductDetail(${p.id})">View / Add Batch</button>`}
                            </td>
                        </tr>
                    `;}).join('')}
                </tbody>
            </table>
            ${products.some(p => parseFloat(p.total_stock) <= 0) ? `
                <div style="padding:14px 22px; background:var(--accent-amber-bg); border-top:1px solid var(--surface-2); font-size:12.5px; color:var(--accent-amber);">
                    ⚠ Products highlighted above have <strong>no stock</strong> and will <strong>not appear in the POS</strong> until you add a batch. Click "+ Add Stock Now" to fix this.
                </div>
            ` : ''}
        `;
    } catch (err) {
        holder.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Failed to load products.</p></div>`;
    }
}

async function openCreateProductModal() {
    let categories = [];
    try { categories = (await Api.listCategories()).categories; } catch { /* ignore */ }

    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Add New Product</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group"><label>Product Code</label><input type="text" id="npCode" placeholder="e.g. PRD-001" /></div>
                    <div class="form-group"><label>Product Name</label><input type="text" id="npName" placeholder="e.g. Cooking Oil 1L" /></div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Category</label>
                        <select id="npCategory">
                            <option value="">-- None --</option>
                            ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Unit</label><input type="text" id="npUnit" value="pcs" placeholder="pcs, kg, litre..." /></div>
                </div>
                <div class="form-group"><label>Reorder Level (low stock alert threshold)</label><input type="number" id="npReorder" value="10" min="0" /></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-dark" onclick="submitCreateProduct()">Save Product</button>
            </div>
        </div>
    `);
}

async function submitCreateProduct() {
    const productCode = document.getElementById('npCode').value.trim();
    const name = document.getElementById('npName').value.trim();
    const categoryId = document.getElementById('npCategory').value || null;
    const unit = document.getElementById('npUnit').value.trim() || 'pcs';
    const reorderLevel = parseInt(document.getElementById('npReorder').value) || 10;

    if (!productCode || !name) { showError('Product code and name are required'); return; }

    try {
        await Api.createProduct({ productCode, name, categoryId, unit, reorderLevel });
        showToast('Product created successfully');
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

        openModal(`
            <div class="modal" style="max-width:720px;">
                <div class="modal-header">
                    <h3>${escapeHtml(p.name)}</h3>
                    <button class="modal-close" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="display:flex; gap:20px; margin-bottom:18px; font-size:13px; color:var(--text-secondary);">
                        <span><strong>Code:</strong> ${escapeHtml(p.product_code)}</span>
                        <span><strong>Unit:</strong> ${escapeHtml(p.unit)}</span>
                        <span><strong>Category:</strong> ${escapeHtml(p.category_name || '-')}</span>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding:12px 14px; background:${isRestricted ? 'var(--accent-amber-bg)' : 'var(--surface-1)'}; border-radius:var(--radius-sm);">
                        <div>
                            <div style="font-size:12.5px; font-weight:600; color:${isRestricted ? 'var(--accent-amber)' : 'var(--text-secondary)'};">
                                ${isRestricted ? `🔒 Restricted — only ${authorizedSellers.length} authorized seller(s)` : '🔓 Any cashier can sell this product'}
                            </div>
                            ${isRestricted && authorizedSellers.length > 0 ? `
                                <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                                    ${authorizedSellers.map(s => escapeHtml(s.full_name)).join(', ')}
                                </div>` : ''}
                        </div>
                        <button class="btn btn-outline btn-sm" onclick="openManageSellersModal(${productId}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">Manage Sellers</button>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h4 style="font-family:var(--font-display); font-size:14px;">Batches</h4>
                        <button class="btn btn-green btn-sm" onclick="openAddBatchModal(${productId}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">+ Add Batch</button>
                    </div>
                    <div style="max-height:320px; overflow-y:auto;">
                        <table>
                            <thead><tr><th>Batch #</th><th>Qty Left</th><th>Buy Price</th><th>Sell Price</th><th>Expiry</th><th>Status</th><th></th></tr></thead>
                            <tbody>
                                ${batches.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No batches yet. Add stock to begin selling this product.</td></tr>` :
                                    batches.map(b => `
                                        <tr>
                                            <td>${escapeHtml(b.batch_number)}</td>
                                            <td>${b.quantity_remaining}</td>
                                            <td>${formatMoney(b.buying_price)}</td>
                                            <td>${formatMoney(b.selling_price)}</td>
                                            <td>${b.expiry_date ? formatDate(b.expiry_date) : '<span style="color:var(--text-muted);">No expiry</span>'}</td>
                                            <td>${statusBadge(b.status)}</td>
                                            <td>
                                                ${b.status === 'active' ? `<button class="btn btn-sm btn-danger" onclick="markBatchDamaged(${b.id}, ${productId}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">Mark Damaged</button>` : ''}
                                            </td>
                                        </tr>
                                    `).join('')}
                            </tbody>
                        </table>
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

function openAddBatchModal(productId, productName) {
    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Add Batch — ${escapeHtml(productName)}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group"><label>Batch Number</label><input type="text" id="nbNumber" placeholder="e.g. BATCH-2026-06" /></div>
                    <div class="form-group"><label>Quantity Received</label><input type="number" id="nbQty" min="1" /></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Buying Price (per unit)</label><input type="number" id="nbBuy" min="0" step="0.01" /></div>
                    <div class="form-group"><label>Selling Price (per unit)</label><input type="number" id="nbSell" min="0" step="0.01" /></div>
                </div>

                <div class="form-group">
                    <label>Received Date</label>
                    ${buildDayMonthYearPicker('nbReceived', { minYear: new Date().getFullYear() - 1, maxYear: new Date().getFullYear() })}
                </div>

                <div style="margin-top:6px; padding-top:14px; border-top:1px solid var(--surface-2);">
                    <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--text-primary); text-transform:none; letter-spacing:0; cursor:pointer; margin-bottom:0;">
                        <input type="checkbox" id="nbNoExpiry" style="width:16px; height:16px;" onchange="toggleExpiryField()" />
                        This product does not expire (e.g. utensils, clothing, electronics)
                    </label>
                </div>

                <div class="form-group" id="nbExpiryWrapper" style="margin-top:14px;">
                    <label>Expiry Date <span style="color:var(--accent-red);">*</span></label>
                    ${buildDayMonthYearPicker('nbExpiry', { minYear: new Date().getFullYear(), maxYear: new Date().getFullYear() + 10 })}
                    <p style="font-size:11.5px; color:var(--text-muted); margin-top:6px;">Required for every batch unless marked "does not expire" above.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="openProductDetail(${productId})">Back</button>
                <button class="btn btn-dark" id="nbSubmitBtn" onclick="submitAddBatch(${productId})">Add Batch</button>
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
        showError('Please fill batch number, quantity, buying and selling price');
        return;
    }
    if (!receivedDate) {
        showError('Please select the received date (day, month, and year)');
        return;
    }
    if (hasExpiry && !expiryDate) {
        showError('Please select the full expiry date (day, month, and year), or tick "This product does not expire"');
        return;
    }

    const btn = document.getElementById('nbSubmitBtn');
    btn.disabled = true;

    try {
        await Api.addBatch(productId, {
            batchNumber, quantity, buyingPrice, sellingPrice, receivedDate,
            hasExpiry, expiryDate, confirmLowPrice
        });
        showToast('Batch added successfully');
        openProductDetail(productId);
        loadProductsTable();
    } catch (err) {
        if (err?.data?.warning === 'price_below_cost') {
            const proceed = confirm(`${err.message}\n\nDo you want to save this batch anyway at a loss-making price?`);
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
                <div class="modal-header"><h3>Who Can Sell — ${escapeHtml(productName)}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
                <div class="modal-body">
                    <label style="display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:600; color:var(--text-primary); text-transform:none; letter-spacing:0; cursor:pointer; margin-bottom:16px;">
                        <input type="checkbox" id="msRestrict" style="width:16px; height:16px;" ${isRestricted ? 'checked' : ''} onchange="toggleSellerList()" />
                        Restrict who can sell this product
                    </label>
                    <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">By default, any cashier can sell any product. Turn this on for items that need special authorization (e.g. high-value goods, age-restricted items).</p>

                    <div id="msSellerList" style="${isRestricted ? '' : 'display:none;'} border-top:1px solid var(--surface-2); padding-top:14px;">
                        <label style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.03em; margin-bottom:10px; display:block;">Authorized Cashiers</label>
                        ${sellers.length === 0 ? `<p style="font-size:12.5px; color:var(--text-muted);">No active cashiers found. Add a cashier account first under Users.</p>` :
                            sellers.map(s => `
                                <label style="display:flex; align-items:center; gap:10px; padding:8px 0; font-size:13.5px; font-weight:400; text-transform:none; letter-spacing:0; cursor:pointer;">
                                    <input type="checkbox" class="ms-seller-checkbox" value="${s.id}" ${authorizedIds.has(s.id) ? 'checked' : ''} style="width:16px; height:16px;" />
                                    ${escapeHtml(s.full_name)} <span style="color:var(--text-muted);">(${escapeHtml(s.username)})</span>
                                </label>
                            `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="openProductDetail(${productId})">Back</button>
                    <button class="btn btn-dark" onclick="submitManageSellers(${productId})">Save</button>
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
        showError('Select at least one cashier, or turn off the restriction');
        return;
    }

    try {
        await Api.updateProductSellers(productId, { restrictSellers, sellerIds });
        showToast('Authorized sellers updated');
        openProductDetail(productId);
    } catch (err) {
        showError(err);
    }
}

async function markBatchDamaged(batchId, productId, productName) {
    if (!confirm(`Mark this batch of "${productName}" as damaged? This will remove its remaining stock and record a loss.`)) return;
    try {
        await Api.updateBatchStatus(batchId, 'damaged', 'Marked damaged via inventory screen');
        showToast('Batch marked as damaged');
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
            <div class="modal-header"><h3>Product Categories</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div style="max-height:280px; overflow-y:auto; margin-bottom:18px;">
                    <table>
                        <thead><tr><th>Name</th><th>Description</th></tr></thead>
                        <tbody>
                            ${categories.length === 0 ? `<tr><td colspan="2" style="text-align:center;color:var(--text-muted);padding:20px;">No categories yet. Add one below.</td></tr>` :
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
                    <h4 style="font-family:var(--font-display); font-size:14px; margin-bottom:12px;">Add New Category</h4>
                    <div class="form-group"><label>Category Name</label><input type="text" id="ncatName" placeholder="e.g. Beverages" /></div>
                    <div class="form-group"><label>Description (optional)</label><input type="text" id="ncatDescription" placeholder="e.g. Soft drinks, juices, water" /></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Close</button>
                <button class="btn btn-dark" onclick="submitCreateCategory()">Add Category</button>
            </div>
        </div>
    `);
}

async function submitCreateCategory() {
    const name = document.getElementById('ncatName').value.trim();
    const description = document.getElementById('ncatDescription').value.trim();
    if (!name) { showError('Category name is required'); return; }

    try {
        await Api.createCategory({ name, description });
        showToast('Category added successfully');
        await renderManageCategoriesModal();
    } catch (err) {
        showError(err);
    }
}
