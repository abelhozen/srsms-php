/* ============================================================
   Suppliers & Customers Pages
   ============================================================ */

async function renderSuppliersPage(container) {
    const canManage = ['super_admin', 'manager', 'store_keeper'].includes(Store.user.role);
    container.innerHTML = `
        <div style="display:flex; justify-content:flex-end; margin-bottom:18px;">
            ${canManage ? `<button class="btn btn-dark" onclick="openCreateSupplierModal()">+ Ongeza Mtoaji</button>` : ''}
        </div>
        <div class="card">
            <div class="card-body" style="padding:0;" id="suppliersTableHolder">
                <div class="loading-spinner" style="margin:40px auto;"></div>
            </div>
        </div>
    `;
    await loadSuppliersTable();
}

async function loadSuppliersTable() {
    const holder = document.getElementById('suppliersTableHolder');
    try {
        const res = await Api.listSuppliers();
        const suppliers = res.suppliers;
        if (suppliers.length === 0) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">🚚</div><p>Hakuna wazabuni walioongezwa bado.</p></div>`;
            return;
        }
        holder.innerHTML = `
            <table>
                <thead><tr><th>Jina</th><th>Mtu wa Mawasiliano</th><th>Simu</th><th>Barua pepe</th><th></th></tr></thead>
                <tbody>
                    ${suppliers.map(s => `
                        <tr>
                            <td><strong>${escapeHtml(s.name)}</strong></td>
                            <td>${escapeHtml(s.contact_person || '-')}</td>
                            <td>${escapeHtml(s.phone || '-')}</td>
                            <td>${escapeHtml(s.email || '-')}</td>
                            <td style="white-space:nowrap;">
                                <button class="btn btn-outline btn-sm" onclick="openEditSupplierModal(${s.id}, '${escapeHtml(s.name).replace(/'/g,"\\'")}', '${escapeHtml(s.contact_person || '').replace(/'/g,"\\'")}', '${escapeHtml(s.phone || '').replace(/'/g,"\\'")}', '${escapeHtml(s.email || '').replace(/'/g,"\\'")}', '${escapeHtml(s.address || '').replace(/'/g,"\\'")}')"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn btn-danger btn-sm" onclick="handleDeleteSupplier(${s.id}, '${escapeHtml(s.name).replace(/'/g,"\\'")}')"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        holder.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Imeshindikana kupakia wazabuni.</p></div>`;
    }
}

function openCreateSupplierModal() {
    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Ongeza Mtoaji</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Jina la Mtoaji</label><input type="text" id="nsName" /></div>
                <div class="form-row">
                    <div class="form-group"><label>Mtu wa Mawasiliano</label><input type="text" id="nsContact" /></div>
                    <div class="form-group"><label>Simu</label><input type="text" id="nsPhone" /></div>
                </div>
                <div class="form-group"><label>Barua pepe</label><input type="email" id="nsEmail" /></div>
                <div class="form-group"><label>Anwani</label><textarea id="nsAddress" rows="2"></textarea></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Ghairi</button>
                <button class="btn btn-dark" onclick="submitCreateSupplier()">Hifadhi Mtoaji</button>
            </div>
        </div>
    `);
}

async function submitCreateSupplier() {
    const name = document.getElementById('nsName').value.trim();
    if (!name) { showError('Supplier name is required'); return; }
    try {
        await Api.createSupplier({
            name,
            contactPerson: document.getElementById('nsContact').value.trim(),
            phone: document.getElementById('nsPhone').value.trim(),
            email: document.getElementById('nsEmail').value.trim(),
            address: document.getElementById('nsAddress').value.trim()
        });
        showToast('Supplier added successfully');
        closeModal();
        loadSuppliersTable();
    } catch (err) {
        showError(err);
    }
}

function openEditSupplierModal(id, name, contactPerson, phone, email, address) {
    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Hariri Mtoaji</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Jina la Mtoaji</label><input type="text" id="esName" value="${escapeHtml(name)}" /></div>
                <div class="form-row">
                    <div class="form-group"><label>Mtu wa Mawasiliano</label><input type="text" id="esContact" value="${escapeHtml(contactPerson)}" /></div>
                    <div class="form-group"><label>Simu</label><input type="text" id="esPhone" value="${escapeHtml(phone)}" /></div>
                </div>
                <div class="form-group"><label>Barua pepe</label><input type="email" id="esEmail" value="${escapeHtml(email)}" /></div>
                <div class="form-group"><label>Anwani</label><textarea id="esAddress" rows="2">${escapeHtml(address)}</textarea></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Ghairi</button>
                <button class="btn btn-dark" onclick="submitEditSupplier(${id})">Hifadhi Mabadiliko</button>
            </div>
        </div>
    `);
}

async function submitEditSupplier(id) {
    try {
        await Api.createSupplier({
            name: document.getElementById('esName').value.trim(),
            contactPerson: document.getElementById('esContact').value.trim(),
            phone: document.getElementById('esPhone').value.trim(),
            email: document.getElementById('esEmail').value.trim(),
            address: document.getElementById('esAddress').value.trim()
        });
        showToast('Supplier updated successfully');
        closeModal();
        loadSuppliersTable();
    } catch (err) {
        showError(err);
    }
}

async function handleDeleteSupplier(id, name) {
    if (!confirm(`Delete supplier ${name}?`)) return;
    try {
        await fetch(`${API_BASE}/partners/suppliers.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
        showToast('Supplier deleted');
        loadSuppliersTable();
    } catch (err) {
        showError(err);
    }
}

// ---- Customers ----

async function renderCustomersPage(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <div class="search-input">
                <span>🔍</span>
                <input type="text" id="customerSearchInput" placeholder="Tafuta wateja..." />
            </div>
            <button class="btn btn-dark" onclick="openCreateCustomerModal()">+ Ongeza Mteja</button>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0;" id="customersTableHolder">
                <div class="loading-spinner" style="margin:40px auto;"></div>
            </div>
        </div>
    `;
    document.getElementById('customerSearchInput').addEventListener('input', debounce(loadCustomersTable, 300));
    await loadCustomersTable();
}

async function loadCustomersTable() {
    const holder = document.getElementById('customersTableHolder');
    const search = document.getElementById('customerSearchInput')?.value || '';
    try {
        const res = await Api.listCustomers(search ? `?search=${encodeURIComponent(search)}` : '');
        const customers = res.customers;
        if (customers.length === 0) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">👥</div><p>Hakuna wateja walio patikana.</p></div>`;
            return;
        }
        holder.innerHTML = `
            <table>
                <thead><tr><th>Jina</th><th>Simu</th><th>Barua pepe</th><th>Anwani</th><th></th></tr></thead>
                <tbody>
                    ${customers.map(c => `
                        <tr>
                            <td><strong>${escapeHtml(c.name)}</strong></td>
                            <td>${escapeHtml(c.phone || '-')}</td>
                            <td>${escapeHtml(c.email || '-')}</td>
                            <td>${escapeHtml(c.address || '-')}</td>
                            <td style="white-space:nowrap;">
                                <button class="btn btn-outline btn-sm" onclick="openEditCustomerModal(${c.id}, '${escapeHtml(c.name).replace(/'/g,"\\'")}', '${escapeHtml(c.phone || '').replace(/'/g,"\\'")}', '${escapeHtml(c.email || '').replace(/'/g,"\\'")}', '${escapeHtml(c.address || '').replace(/'/g,"\\'")}')"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn btn-danger btn-sm" onclick="handleDeleteCustomer(${c.id}, '${escapeHtml(c.name).replace(/'/g,"\\'")}')"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        holder.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Imeshindikana kupakia wateja.</p></div>`;
    }
}

function openCreateCustomerModal() {
    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Ongeza Mteja</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Jina la Mteja</label><input type="text" id="ncName" /></div>
                <div class="form-row">
                    <div class="form-group"><label>Simu</label><input type="text" id="ncPhone" /></div>
                    <div class="form-group"><label>Barua pepe</label><input type="email" id="ncEmail" /></div>
                </div>
                <div class="form-group"><label>Anwani</label><textarea id="ncAddress" rows="2"></textarea></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Ghairi</button>
                <button class="btn btn-dark" onclick="submitCreateCustomer()">Hifadhi Mteja</button>
            </div>
        </div>
    `);
}

async function submitCreateCustomer() {
    const name = document.getElementById('ncName').value.trim();
    if (!name) { showError('Customer name is required'); return; }
    try {
        await Api.createCustomer({
            name,
            phone: document.getElementById('ncPhone').value.trim(),
            email: document.getElementById('ncEmail').value.trim(),
            address: document.getElementById('ncAddress').value.trim()
        });
        showToast('Customer added successfully');
        closeModal();
        loadCustomersTable();
    } catch (err) {
        showError(err);
    }
}

function openEditCustomerModal(id, name, phone, email, address) {
    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Hariri Mteja</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Jina la Mteja</label><input type="text" id="ecName" value="${escapeHtml(name)}" /></div>
                <div class="form-row">
                    <div class="form-group"><label>Simu</label><input type="text" id="ecPhone" value="${escapeHtml(phone)}" /></div>
                    <div class="form-group"><label>Barua pepe</label><input type="email" id="ecEmail" value="${escapeHtml(email)}" /></div>
                </div>
                <div class="form-group"><label>Anwani</label><textarea id="ecAddress" rows="2">${escapeHtml(address)}</textarea></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Ghairi</button>
                <button class="btn btn-dark" onclick="submitEditCustomer(${id})">Hifadhi Mabadiliko</button>
            </div>
        </div>
    `);
}

async function submitEditCustomer(id) {
    try {
        await Api.createCustomer({
            name: document.getElementById('ecName').value.trim(),
            phone: document.getElementById('ecPhone').value.trim(),
            email: document.getElementById('ecEmail').value.trim(),
            address: document.getElementById('ecAddress').value.trim()
        });
        showToast('Customer updated successfully');
        closeModal();
        loadCustomersTable();
    } catch (err) {
        showError(err);
    }
}

async function handleDeleteCustomer(id, name) {
    if (!confirm(`Delete customer ${name}?`)) return;
    try {
        await fetch(`${API_BASE}/partners/customers.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
        showToast('Customer deleted');
        loadCustomersTable();
    } catch (err) {
        showError(err);
    }
}
