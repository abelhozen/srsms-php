/* ============================================================
   User Profile Page
   ============================================================ */

async function renderProfilePage(container) {
    container.innerHTML = `<div class="card"><div class="card-body"><div class="loading-spinner" style="margin:30px auto;"></div></div></div>`;

    try {
        const res = await Api.getProfile();
        const profile = res.profile || {};
container.innerHTML = `
        <div class="card" style="width:100%; max-width:none;">

                <div class="card-header"><h3>Wasifu Wangu</h3></div>
                <div class="card-body" style="padding:28px;">

                    <div class="form-row">
                        <div class="form-group"><label>Jina Kamili</label><input type="text" id="profileFullName" value="${escapeHtml(profile.full_name || '')}" /></div>
                        <div class="form-group"><label>Jina la Mtumiaji</label><input type="text" id="profileUsername" value="${escapeHtml(profile.username || '')}" disabled /></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Barua pepe</label><input type="email" id="profileEmail" value="${escapeHtml(profile.email || '')}" /></div>
                        <div class="form-group"><label>Simu</label><input type="text" id="profilePhone" value="${escapeHtml(profile.phone || '')}" /></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Jukumu</label><input type="text" value="${escapeHtml(profile.role_label || profile.role_name || '')}" disabled /></div>
                        <div class="form-group"><label>Hali</label><input type="text" value="${escapeHtml(profile.status || '')}" disabled /></div>
                    </div>
                    <div class="form-group"><label>Nenosiri la Sasa</label><input type="password" id="profileCurrentPassword" placeholder="Inahitajika tu ukibadilisha nenosiri" /></div>
                    <div class="form-row">
                        <div class="form-group"><label>Nenosiri Jipya</label><input type="password" id="profileNewPassword" placeholder="Angalau herufi 6" /></div>
                        <div class="form-group"><label>Thibitisha Nenosiri Jipya</label><input type="password" id="profileConfirmPassword" placeholder="Andika tena nenosiri jipya" /></div>
                    </div>
                    <button class="btn btn-dark" onclick="submitProfileUpdate()">Hifadhi Wasifu</button>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Imeshindikana kupakia wasifu.</p></div>`;
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
        showError('Nenosiri jipya na uthibitisho lake hazilingani');
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
        showToast('Wasifu umehifadhiwa kwa mafanikio');
        renderProfilePage(document.getElementById('pageBody'));
    } catch (err) {
        showError(err);
    }
}
