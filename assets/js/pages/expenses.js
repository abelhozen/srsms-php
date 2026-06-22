/* ============================================================
   Expenses Page
   ============================================================ */

async function renderExpensesPage(container) {
    const canApprove = ['owner', 'accountant', 'super_admin'].includes(Store.user.role);
    const canCreate = ['accountant', 'owner', 'super_admin'].includes(Store.user.role);

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <div class="tabs" id="expenseTabs">
                <button class="tab-btn active" data-status="" onclick="filterExpenses('')">All</button>
                <button class="tab-btn" data-status="pending" onclick="filterExpenses('pending')">Pending</button>
                <button class="tab-btn" data-status="approved" onclick="filterExpenses('approved')">Approved</button>
                <button class="tab-btn" data-status="rejected" onclick="filterExpenses('rejected')">Rejected</button>
            </div>
            ${canCreate ? `<button class="btn btn-dark" onclick="openCreateExpenseModal()">+ Record Expense</button>` : ''}
        </div>
        <div class="card">
            <div class="card-body" style="padding:0;" id="expensesTableHolder">
                <div class="loading-spinner" style="margin:40px auto;"></div>
            </div>
        </div>
    `;
    window.__expenseStatus = '';
    window.__canApproveExpense = canApprove;
    await loadExpensesTable();
}

function filterExpenses(status) {
    window.__expenseStatus = status;
    document.querySelectorAll('#expenseTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.status === status));
    loadExpensesTable();
}

async function loadExpensesTable() {
    const holder = document.getElementById('expensesTableHolder');
    const status = window.__expenseStatus || '';
    const canApprove = window.__canApproveExpense;

    try {
        const res = await Api.listExpenses(status ? `?status=${status}` : '');
        const expenses = res.expenses;
        if (expenses.length === 0) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">💵</div><p>No expenses found.</p></div>`;
            return;
        }
        holder.innerHTML = `
            <table>
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Recorded By</th><th>Status</th>${canApprove ? '<th></th>' : ''}</tr></thead>
                <tbody>
                    ${expenses.map(e => `
                        <tr>
                            <td>${formatDate(e.expense_date)}</td>
                            <td>${escapeHtml(e.description)}</td>
                            <td>${escapeHtml(e.category_name || '-')}</td>
                            <td>${formatMoney(e.amount)}</td>
                            <td>${escapeHtml(e.created_by_name)}</td>
                            <td>${statusBadge(e.status)}</td>
                            ${canApprove ? `<td>
                                ${e.status === 'pending' ? `
                                    <button class="btn btn-green btn-sm" onclick="decideExpense(${e.id}, 'approved')">Approve</button>
                                    <button class="btn btn-danger btn-sm" onclick="decideExpense(${e.id}, 'rejected')">Reject</button>
                                ` : ''}
                            </td>` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        holder.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Failed to load expenses.</p></div>`;
    }
}

async function decideExpense(id, decision) {
    if (!confirm(`${decision === 'approved' ? 'Approve' : 'Reject'} this expense?`)) return;
    try {
        await Api.approveExpense(id, decision);
        showToast(`Expense ${decision}`);
        loadExpensesTable();
    } catch (err) {
        showError(err);
    }
}

async function openCreateExpenseModal() {
    let categories = [];
    try { categories = (await Api.listExpenseCategories()).categories; } catch { /* ignore */ }

    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Record Expense</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Description</label><input type="text" id="neDesc" placeholder="e.g. Electricity bill - June" /></div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Category</label>
                        <select id="neCategory">
                            <option value="">-- Uncategorized --</option>
                            ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Amount</label><input type="number" id="neAmount" min="0" step="0.01" /></div>
                </div>
                <div class="form-group"><label>Expense Date</label><input type="date" id="neDate" value="${todayISO()}" /></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-dark" onclick="submitCreateExpense()">Submit for Approval</button>
            </div>
        </div>
    `);
}

async function submitCreateExpense() {
    const description = document.getElementById('neDesc').value.trim();
    const categoryId = document.getElementById('neCategory').value || null;
    const amount = parseFloat(document.getElementById('neAmount').value);
    const expenseDate = document.getElementById('neDate').value;

    if (!description || !amount || !expenseDate) { showError('Please fill description, amount and date'); return; }

    try {
        await Api.createExpense({ categoryId, description, amount, expenseDate });
        showToast('Expense recorded, pending approval');
        closeModal();
        loadExpensesTable();
    } catch (err) {
        showError(err);
    }
}
