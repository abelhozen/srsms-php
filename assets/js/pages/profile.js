/* ============================================================
   User Profile Page
   ============================================================ */

async function renderProfilePage(container) {
    container.innerHTML = `<div class="card"><div class="card-body"><div class="loading-spinner" style="margin:30px auto;"></div></div></div>`;

    try {
        const res = await Api.getProfile();
        const profile = res.profile || {};
        container.innerHTML = `
            <div class="card" style="max-width:760px;">
                <div class="card-header"><h3>My Profile</h3></div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group"><label>Full Name</label><input type="text" id="profileFullName" value="${escapeHtml(profile.full_name || '')}" /></div>
                        <div class="form-group"><label>Username</label><input type="text" id="profileUsername" value="${escapeHtml(profile.username || '')}" disabled /></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Email</label><input type="email" id="profileEmail" value="${escapeHtml(profile.email || '')}" /></div>
                        <div class="form-group"><label>Phone</label><input type="text" id="profilePhone" value="${escapeHtml(profile.phone || '')}" /></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Role</label><input type="text" value="${escapeHtml(profile.role_label || profile.role_name || '')}" disabled /></div>
                        <div class="form-group"><label>Status</label><input type="text" value="${escapeHtml(profile.status || '')}" disabled /></div>
                    </div>
                    <div class="form-group"><label>Current Password</label><input type="password" id="profileCurrentPassword" placeholder="Required only if changing password" /></div>
                    <div class="form-row">
                        <div class="form-group"><label>New Password</label><input type="password" id="profileNewPassword" placeholder="Minimum 6 characters" /></div>
                        <div class="form-group"><label>Confirm New Password</label><input type="password" id="profileConfirmPassword" placeholder="Re-enter new password" /></div>
                    </div>
                    <button class="btn btn-dark" onclick="submitProfileUpdate()">Save Profile</button>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Failed to load profile.</p></div>`;
    }
}

async function submitProfileUpdate() {
    const fullName = document.getElementById('profileFullName')?.value.trim();
    const email = document.getElementById('profileEmail')?.value.trim();
    const phone = document.getElementById('profilePhone')?.value.trim();
    const currentPassword = document.getElementById('profileCurrentPassword')?.value;
    const newPassword = document.getElementById('profileNewPassword')?.value;
    const confirmPassword = document.getElementById('profileConfirmPassword')?.value;

    if (newPassword && newPassword !== confirmPassword) {
        showError('New password and confirmation do not match');
        return;
    }

    try {
        await Api.updateProfile({
            fullName,
            email,
            phone,
            currentPassword: currentPassword || null,
            newPassword: newPassword || null
        });
        showToast('Profile updated successfully');
        renderProfilePage(document.getElementById('pageBody'));
    } catch (err) {
        showError(err);
    }
}
