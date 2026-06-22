/* ============================================================
   Users & Roles Management Page (Super Admin / Admin)
   ============================================================ */

async function renderUsersPage(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:flex-end; margin-bottom:18px;">
            <button class="btn btn-dark" onclick="openCreateUserModal()">+ Add User</button>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0;" id="usersTableHolder">
                <div class="loading-spinner" style="margin:40px auto;"></div>
            </div>
        </div>
    `;
    await loadUsersTable();
}

async function loadUsersTable() {
    const holder = document.getElementById('usersTableHolder');
    const isSuperAdmin = Store.user.role === 'super_admin';
    try {
        const res = await Api.listUsers();
        const users = res.users;
        holder.innerHTML = `
            <table>
                <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Last Login</th><th></th></tr></thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td><strong>${escapeHtml(u.full_name)}</strong></td>
                            <td>${escapeHtml(u.username)}</td>
                            <td><span class="badge badge-blue">${escapeHtml(u.role_label)}</span></td>
                            <td>${statusBadge(u.status)}</td>
                            <td>${u.last_login_at ? formatDateTime(u.last_login_at) : 'Never'}</td>
                            <td style="white-space:nowrap;">
                                <button class="btn btn-outline btn-sm" onclick="openEditUserModal(${u.id}, '${escapeHtml(u.full_name).replace(/'/g,"\\'")}', '${escapeHtml(u.email||'')}', '${escapeHtml(u.phone||'')}', ${u.role_id}, '${u.status}')">Edit</button>
                                <button class="btn btn-outline btn-sm" onclick="openResetPasswordModal(${u.id}, '${escapeHtml(u.full_name).replace(/'/g,"\\'")}')">Reset PW</button>
                                ${isSuperAdmin && u.role_name !== 'super_admin' ? `<button class="btn btn-danger btn-sm" onclick="handleDisableUser(${u.id}, '${escapeHtml(u.full_name).replace(/'/g,"\\'")}')">Disable</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        holder.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Failed to load users.</p></div>`;
    }
}

async function openCreateUserModal() {
    let roles = [];
    try { roles = (await Api.listRoles()).roles; } catch { /* ignore */ }

    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Add User</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Full Name</label><input type="text" id="nuFullName" /></div>
                <div class="form-row">
                    <div class="form-group"><label>Username</label><input type="text" id="nuUsername" /></div>
                    <div class="form-group"><label>Role</label>
                        <select id="nuRole">
                            ${roles.map(r => `<option value="${r.id}">${escapeHtml(r.label)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Email</label><input type="email" id="nuEmail" /></div>
                    <div class="form-group"><label>Phone</label><input type="text" id="nuPhone" /></div>
                </div>
                <div class="form-group"><label>Temporary Password</label><input type="text" id="nuPassword" placeholder="Min. 6 characters" /></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-dark" onclick="submitCreateUser()">Create User</button>
            </div>
        </div>
    `);
}

async function submitCreateUser() {
    const fullName = document.getElementById('nuFullName').value.trim();
    const username = document.getElementById('nuUsername').value.trim();
    const roleId = document.getElementById('nuRole').value;
    const email = document.getElementById('nuEmail').value.trim();
    const phone = document.getElementById('nuPhone').value.trim();
    const password = document.getElementById('nuPassword').value;

    if (!fullName || !username || !password) { showError('Full name, username and password are required'); return; }

    try {
        await Api.createUser({ fullName, username, email, phone, password, roleId });
        showToast('User created successfully');
        closeModal();
        loadUsersTable();
    } catch (err) {
        showError(err);
    }
}

async function openEditUserModal(id, fullName, email, phone, roleId, status) {
    let roles = [];
    try { roles = (await Api.listRoles()).roles; } catch { /* ignore */ }

    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Edit User</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Full Name</label><input type="text" id="euFullName" value="${escapeHtml(fullName)}" /></div>
                <div class="form-row">
                    <div class="form-group"><label>Email</label><input type="email" id="euEmail" value="${escapeHtml(email)}" /></div>
                    <div class="form-group"><label>Phone</label><input type="text" id="euPhone" value="${escapeHtml(phone)}" /></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Role</label>
                        <select id="euRole">
                            ${roles.map(r => `<option value="${r.id}" ${r.id === roleId ? 'selected' : ''}>${escapeHtml(r.label)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Status</label>
                        <select id="euStatus">
                            <option value="active" ${status==='active'?'selected':''}>Active</option>
                            <option value="suspended" ${status==='suspended'?'selected':''}>Suspended</option>
                            <option value="disabled" ${status==='disabled'?'selected':''}>Disabled</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-dark" onclick="submitEditUser(${id})">Save Changes</button>
            </div>
        </div>
    `);
}

async function submitEditUser(id) {
    try {
        await Api.updateUser(id, {
            fullName: document.getElementById('euFullName').value.trim(),
            email: document.getElementById('euEmail').value.trim(),
            phone: document.getElementById('euPhone').value.trim(),
            roleId: document.getElementById('euRole').value,
            status: document.getElementById('euStatus').value
        });
        showToast('User updated successfully');
        closeModal();
        loadUsersTable();
    } catch (err) {
        showError(err);
    }
}

function openResetPasswordModal(id, fullName) {
    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Reset Password — ${escapeHtml(fullName)}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>New Password</label><input type="text" id="rpPassword" placeholder="Min. 6 characters" /></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-dark" onclick="submitResetPassword(${id})">Reset Password</button>
            </div>
        </div>
    `);
}

async function submitResetPassword(id) {
    const newPassword = document.getElementById('rpPassword').value;
    if (!newPassword || newPassword.length < 6) { showError('Password must be at least 6 characters'); return; }
    try {
        await Api.resetPassword(id, newPassword);
        showToast('Password reset successfully');
        closeModal();
    } catch (err) {
        showError(err);
    }
}

async function handleDisableUser(id, fullName) {
    if (!confirm(`Disable account for ${fullName}? They will no longer be able to log in.`)) return;
    try {
        await Api.deleteUser(id);
        showToast('User disabled');
        loadUsersTable();
    } catch (err) {
        showError(err);
    }
}
