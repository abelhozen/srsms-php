/* ============================================================

   Users & Roles Management Page (Super Admin / Admin)
   ============================================================ */

let rolePermissionEditorState = null;

async function renderUsersPage(container) {
    const canManageUsers = hasUserManagementAccess();
    container.innerHTML = `
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:18px;">
            ${canManageUsers ? '<button class="btn btn-outline" id="manageRolePermissionsBtn"><i class="fa-solid fa-shield-halved"></i> Ruhusa za Majukumu</button>' : ''}
            ${canManageUsers ? '<button class="btn btn-dark" onclick="openCreateUserModal()">+ Ongeza Mtumiaji</button>' : ''}
        </div>
        <section class="role-permission-editor" id="rolePermissionsPanel" hidden></section>
        <div class="card">
            <div class="card-body" style="padding:0;" id="usersTableHolder">
                <div class="loading-spinner" style="margin:40px auto;"></div>
            </div>
        </div>
    `;
    document.getElementById('manageRolePermissionsBtn')?.addEventListener('click', openRolePermissionsPanel);
    await loadUsersTable();
}

async function openRolePermissionsPanel() {
    if (!ensureUserManagementAccess()) return;
    const panel = document.getElementById('rolePermissionsPanel');
    try {
        const result = await Api.listRoles();
        const roles = result.roles.filter(role => role.name !== 'super_admin');
        if (!roles.length) {
            showError('Hakuna majukumu yanayoweza kusanidiwa.');
            return;
        }
        rolePermissionEditorState = { roles, permissions: result.permissions };
        panel.hidden = false;
        panel.innerHTML = `
            <div class="role-permission-editor-header">
                <h2>Ruhusa za Majukumu</h2>
                <button class="btn btn-outline btn-sm" id="closeRolePermissionsBtn" aria-label="Funga ruhusa za majukumu"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="role-permission-editor-controls">
                <label for="rolePermissionsSelect">Chagua jukumu</label>
                <select id="rolePermissionsSelect">
                    ${roles.map(role => `<option value="${role.id}" ${String(role.id) === String(Store.user.roleId) ? 'selected' : ''}>${escapeHtml(role.label)}</option>`).join('')}
                </select>
            </div>
            <div id="rolePermissionOptions"></div>
            <div class="role-permission-editor-footer">
                <button class="btn btn-dark" id="saveRolePermissionsBtn"><i class="fa-solid fa-floppy-disk"></i> Hifadhi Ruhusa</button>
            </div>
        `;
        document.getElementById('closeRolePermissionsBtn').addEventListener('click', () => { panel.hidden = true; });
        document.getElementById('rolePermissionsSelect').addEventListener('change', renderRolePermissionControls);
        document.getElementById('saveRolePermissionsBtn').addEventListener('click', saveRolePermissions);
        renderRolePermissionControls();
    } catch (err) {
        showError(err);
    }
}

function renderRolePermissionControls() {
    const state = rolePermissionEditorState;
    const roleId = document.getElementById('rolePermissionsSelect')?.value;
    const role = state?.roles.find(item => String(item.id) === String(roleId));
    const target = document.getElementById('rolePermissionOptions');
    if (!role || !target) return;

    const enabledIds = new Set(role.permissions.map(permission => String(permission.id)));
    const permissionsByModule = {};
    state.permissions.forEach(permission => {
        const module = permission.module || 'other';
        if (!permissionsByModule[module]) permissionsByModule[module] = [];
        permissionsByModule[module].push(permission);
    });

    target.innerHTML = Object.entries(permissionsByModule).map(([module, permissions]) => `
        <section class="role-permission-config-module">
            <h3>${escapeHtml(module)}</h3>
            <div class="role-permission-config-list">
                ${permissions.map(permission => {
                    const keepAdminAccess = String(role.id) === String(Store.user.roleId) && permission.code === 'users.manage';
                    return `
                        <label class="role-permission-option">
                            <input type="checkbox" name="rolePermission" value="${permission.id}" ${enabledIds.has(String(permission.id)) ? 'checked' : ''} ${keepAdminAccess ? 'disabled' : ''} />
                            <span>${escapeHtml(permission.label)}</span>
                        </label>
                    `;
                }).join('')}
            </div>
        </section>
    `).join('');
}

async function saveRolePermissions() {
    const roleId = document.getElementById('rolePermissionsSelect')?.value;
    const role = rolePermissionEditorState?.roles.find(item => String(item.id) === String(roleId));
    if (!role) return;

    const permissionIds = Array.from(document.querySelectorAll('#rolePermissionOptions input[name="rolePermission"]:checked'))
        .map(input => Number(input.value));
    const button = document.getElementById('saveRolePermissionsBtn');
    button.disabled = true;
    try {
        await Api.updateRolePermissions(roleId, permissionIds);
        role.permissions = rolePermissionEditorState.permissions.filter(permission => permissionIds.includes(Number(permission.id)));
        showToast('Ruhusa za jukumu zimesasishwa');
        if (String(Store.user.roleId) === String(roleId)) {
            await bootApp();
            return;
        }
        renderRolePermissionControls();
    } catch (err) {
        showError(err);
    } finally {
        if (button.isConnected) button.disabled = false;
    }
}

async function loadUsersTable() {
    const holder = document.getElementById('usersTableHolder');
    const canManageUsers = hasUserManagementAccess();
    const isSuperAdmin = Store.user.role === 'super_admin';
    try {
        const res = await Api.listUsers();
        const users = res.users;
        holder.innerHTML = `
            <table>
                <thead><tr><th>Jina</th><th>Jina la Mtumiaji</th><th>Jukumu</th><th>Hali</th><th>Ingia Mwisho</th><th></th></tr></thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td><strong>${escapeHtml(u.full_name)}</strong></td>
                            <td>${escapeHtml(u.username)}</td>
                            <td><span class="badge badge-blue">${escapeHtml(u.role_label)}</span></td>
                            <td>${statusBadge(u.status)}</td>
                            <td>${u.last_login_at ? formatDateTime(u.last_login_at) : 'Never'}</td>
                            <td style="white-space:nowrap;">
                                ${canManageUsers ? `
                                    <button class="btn btn-outline btn-sm" onclick="openEditUserModal(${u.id}, '${escapeHtml(u.full_name).replace(/'/g,"\\'")}', '${escapeHtml(u.email||'')}', '${escapeHtml(u.phone||'')}', ${u.role_id}, '${u.status}')"><i class="fa-solid fa-pen"></i></button>
                                    ${isSuperAdmin ? `<button class="btn btn-outline btn-sm" onclick="openResetPasswordModal(${u.id}, '${escapeHtml(u.full_name).replace(/'/g,"\\'")}')"><i class="fa-solid fa-key"></i></button>` : ''}
                                    ${isSuperAdmin && u.id !== Store.user.id ? `<button class="btn btn-danger btn-sm" data-action="disable-user" data-user-id="${u.id}" data-user-name='${escapeHtml(u.full_name).replace(/'/g,"\\'")}'><i class="fa-solid fa-user-slash"></i></button>` : ''}
                                ` : '<span class="badge badge-gray">Soma tu</span>'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // single listener for all rows (fast)
        if (!holder.dataset._userTableBound) {
            holder.dataset._userTableBound = '1';
            holder.addEventListener('click', handleUserTableClick);
        }

    } catch (err) {
        holder.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Imeshindikana kupakia watumiaji.</p></div>`;
    }
}

function hasUserManagementAccess() {
    return Store.user?.role === 'super_admin' || Store.permissions.includes('users.manage');
}

function ensureUserManagementAccess() {
    if (!hasUserManagementAccess()) {
        showError('Huna ruhusa ya kusimamia watumiaji.');
        return false;
    }
    return true;
}

function renderRolePermissions(roleSelectId, targetId, roles) {
    const selectedRoleId = document.getElementById(roleSelectId).value;
    const role = roles.find(item => String(item.id) === String(selectedRoleId));
    const target = document.getElementById(targetId);
    if (!role || role.permissions.length === 0) {
        target.innerHTML = '<p class="role-permissions-empty">Jukumu hili halina ruhusa zilizowekwa.</p>';
        return;
    }

    const groupForPermission = permission => {
        if (/\.view(?:_|$)/.test(permission.code)) return 'View';
        if (/\.(manage|create)$/.test(permission.code)) return 'Edit';
        return 'Misc';
    };
    const moduleLabels = {
        admin: 'Administration',
        audit: 'Audit',
        dashboard: 'Dashboard',
        finance: 'Finance',
        inventory: 'Inventory',
        reports: 'Reports',
        sales: 'Sales & POS'
    };
    const permissionsByModule = {};
    role.permissions.forEach(permission => {
        const module = permission.module || 'other';
        if (!permissionsByModule[module]) {
            permissionsByModule[module] = { View: [], Edit: [], Misc: [] };
        }
        permissionsByModule[module][groupForPermission(permission)].push(permission);
    });

    target.innerHTML = `
        <strong>Ruhusa za ${escapeHtml(role.label)}</strong>
        <div class="role-permission-modules">
            ${Object.entries(permissionsByModule).map(([module, groups]) => `
                <section class="role-permission-module">
                    <h4>${escapeHtml(moduleLabels[module] || module)}</h4>
                    <div class="role-permission-groups">
                        ${['View', 'Edit', 'Misc'].map(group => `
                            <div class="role-permission-group">
                                <h5>${group}</h5>
                                <ul>${groups[group].map(permission => `<li>${escapeHtml(permission.label)}</li>`).join('')}</ul>
                            </div>
                        `).join('')}
                    </div>
                </section>
            `).join('')}
        </div>
    `;
}

function disableButton(btnEl, disabled) {
    if (!btnEl) return;
    btnEl.disabled = disabled;
    if (disabled) btnEl.dataset._origText = btnEl.innerHTML;
    if (disabled) btnEl.innerHTML = 'Working...';
    else if (btnEl.dataset._origText) btnEl.innerHTML = btnEl.dataset._origText;
}

function handleUserTableClick(e) {
    const btn = e.target.closest('button[data-action="disable-user"]');
    if (!btn) return;

    const id = btn.dataset.userId;
    const name = btn.dataset.userName || '';
    if (!id) return;

    // prevent multiple clicks
    if (btn.disabled) return;

    if (!confirm(`Zima akaunti ya ${name}? Hawawezi kuingia tena.`)) return;

    // run async but keep UI responsive
    disableButton(btn, true);
    Api.deleteUser(parseInt(id, 10))
        .then(() => {
            showToast('Akaunti imezimwa');
            loadUsersTable();
        })
        .catch(err => showError(err))
        .finally(() => disableButton(btn, false));
}


async function openCreateUserModal() {
    if (!ensureUserManagementAccess()) return;
    let roles;
    try {
        roles = (await Api.listRoles()).roles;
    } catch (err) {
        showError(err);
        return;
    }
    if (!roles.length) {
        showError('Hakuna majukumu yaliyosanidiwa kwenye mfumo.');
        return;
    }

    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Ongeza Mtumiaji</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Jina Kamili</label><input type="text" id="nuFullName" /></div>
                <div class="form-row">
                    <div class="form-group"><label>Jina la Mtumiaji</label><input type="text" id="nuUsername" /></div>
                    <div class="form-group"><label>Jukumu</label>
                        <select id="nuRole">
                            ${roles.map(r => `<option value="${r.id}">${escapeHtml(r.label)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="role-permissions" id="nuRolePermissions"></div>
                <div class="form-row">
                    <div class="form-group"><label>Barua pepe</label><input type="email" id="nuEmail" /></div>
                    <div class="form-group"><label>Simu</label><input type="text" id="nuPhone" /></div>
                </div>
                <div class="form-group"><label>Nenosiri la Muda</label><input type="text" id="nuPassword" placeholder="Angalau herufi 6" /></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Ghairi</button>
                <button class="btn btn-dark" onclick="submitCreateUser()">Unda Mtumiaji</button>
            </div>
        </div>
    `);
    document.getElementById('nuRole').addEventListener('change', () => renderRolePermissions('nuRole', 'nuRolePermissions', roles));
    renderRolePermissions('nuRole', 'nuRolePermissions', roles);
}

async function submitCreateUser() {
    if (!ensureUserManagementAccess()) return;
    const fullName = document.getElementById('nuFullName').value.trim();
    const username = document.getElementById('nuUsername').value.trim();
    const roleId = document.getElementById('nuRole').value;
    const email = document.getElementById('nuEmail').value.trim();
    const phone = document.getElementById('nuPhone').value.trim();
    const password = document.getElementById('nuPassword').value;

    if (!fullName || !username || !password) { showError('Jina kamili, jina la mtumiaji na nenosiri vinahitajika'); return; }

    try {
        await Api.createUser({ fullName, username, email, phone, password, roleId });
        showToast('Mtumiaji ameundwa kwa mafanikio');
        closeModal();
        loadUsersTable();
    } catch (err) {
        showError(err);
    }
}

async function openEditUserModal(id, fullName, email, phone, roleId, status) {
    if (!ensureUserManagementAccess()) return;
    let roles;
    try {
        roles = (await Api.listRoles()).roles;
    } catch (err) {
        showError(err);
        return;
    }
    if (!roles.length) {
        showError('Hakuna majukumu yaliyosanidiwa kwenye mfumo.');
        return;
    }
    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Hariri Mtumiaji</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Jina Kamili</label><input type="text" id="euFullName" value="${escapeHtml(fullName)}" /></div>
                <div class="form-row">
                    <div class="form-group"><label>Barua pepe</label><input type="email" id="euEmail" value="${escapeHtml(email)}" /></div>
                    <div class="form-group"><label>Simu</label><input type="text" id="euPhone" value="${escapeHtml(phone)}" /></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Role</label>
                        <select id="euRole">
                            ${roles.map(r => `<option value="${r.id}" ${String(r.id) === String(roleId) ? 'selected' : ''}>${escapeHtml(r.label)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Hali</label>
                        <select id="euStatus">
                            <option value="active" ${status==='active'?'selected':''}>Inatumika</option>
                            <option value="suspended" ${status==='suspended'?'selected':''}>Imesimamishwa</option>
                            <option value="disabled" ${status==='disabled'?'selected':''}>Imezimwa</option>
                        </select>
                    </div>
                </div>
                <div class="role-permissions" id="euRolePermissions"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Ghairi</button>
                <button class="btn btn-dark" onclick="submitEditUser(${id})">Hifadhi Mabadiliko</button>
            </div>
        </div>
    `);
    document.getElementById('euRole').addEventListener('change', () => renderRolePermissions('euRole', 'euRolePermissions', roles));
    renderRolePermissions('euRole', 'euRolePermissions', roles);
}

async function submitEditUser(id) {
    if (!ensureUserManagementAccess()) return;
    try {
        await Api.updateUser(id, {
            fullName: document.getElementById('euFullName').value.trim(),
            email: document.getElementById('euEmail').value.trim(),
            phone: document.getElementById('euPhone').value.trim(),
            roleId: document.getElementById('euRole').value,
            status: document.getElementById('euStatus').value
        });
        showToast('Mtumiaji amesasishwa kwa mafanikio');
        closeModal();
        loadUsersTable();
    } catch (err) {
        showError(err);
    }
}

function openResetPasswordModal(id, fullName) {
    if (!ensureUserManagementAccess()) return;
    openModal(`
        <div class="modal">
            <div class="modal-header"><h3>Rekebisha Nenosiri — ${escapeHtml(fullName)}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Nenosiri Jipya</label><input type="text" id="rpPassword" placeholder="Angalau herufi 6" /></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Ghairi</button>
                <button class="btn btn-dark" onclick="submitResetPassword(${id})">Rekebisha Nenosiri</button>
            </div>
        </div>
    `);
}

async function submitResetPassword(id) {
    if (!ensureUserManagementAccess()) return;
    const newPassword = document.getElementById('rpPassword').value;
    if (!newPassword || newPassword.length < 6) { showError('Nenosiri lazima liwe na angalau herufi 6'); return; }
    try {
        await Api.resetPassword(id, newPassword);
        showToast('Nenosiri limebadilishwa kwa mafanikio');
        closeModal();
    } catch (err) {
        showError(err);
    }
}

async function handleDisableUser(id, fullName) {
    // kept for backward compatibility (inline onclick in older builds)
    if (!ensureUserManagementAccess()) return;
    if (!confirm(`Disable account for ${fullName}? They will no longer be able to log in.`)) return;
    try {
        await Api.deleteUser(id);
        showToast('User disabled');
        loadUsersTable();
    } catch (err) {
        showError(err);
    }
}
