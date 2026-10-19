// Backup helper UI functions for Admin settings page

async function loadBackupList() {
    const holder = document.getElementById('backupListHolder');
    if (!holder) return;
    holder.innerHTML = `<div class="loading-spinner" style="margin:20px auto;"></div>`;
    try {
        const res = await Api.listBackups(20);
        const backups = res.backups || [];
        if (!backups.length) {
            holder.innerHTML = `<div class="empty-state"><div class="icon">🗄️</div><p>Hakuna chelezo zilizopatikana.</p></div>`;
            return;
        }

        holder.innerHTML = `
            <table>
                <thead><tr><th>Created</th><th>File</th><th>Size</th><th></th></tr></thead>
                <tbody>
                    ${backups.map(b => `
                        <tr>
                            <td style="white-space:nowrap;">${formatDateTime(b.created_at)}</td>
                            <td style="font-family:var(--font-mono);font-size:11px;">${escapeHtml(b.filename)}</td>
                            <td>${formatBytes(b.size_bytes || 0)}</td>
                            <td style="white-space:nowrap;">
                                <button class="btn btn-outline btn-sm" onclick="downloadBackup('${escapeJs(b.filename)}')">Pakua</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        holder.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Imeshindikana kupakia chelezo.</p></div>`;
    }
}

async function createBackupNow() {
    try {
        const btn = document.querySelector('#pageBody button.btn.btn-dark[onclick="createBackupNow()"]');
        if (btn) btn.disabled = true;

        showToast('Inatengeneza chelezo...');
        await Api.createBackup();
        showToast('Chelezo imeundwa');
        await loadBackupList();
    } catch (err) {
        showError(err);
    } finally {
        const btn = document.querySelector('#pageBody button.btn.btn-dark[onclick="createBackupNow()"]');
        if (btn) btn.disabled = false;
    }
}

function downloadBackup(filename) {
    Api.downloadBackup(filename)
        .catch(err => showError(err));
}

// Utilities expected globally from utils.js/app.js
function formatBytes(bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return b + ' B';
    const units = ['KB','MB','GB','TB'];
    let i = -1;
    let v = b;
    do {
        v = v / 1024;
        i++;
    } while (v >= 1024 && i < units.length - 1);
    return `${v.toFixed(2)} ${units[i]}`;
}

function escapeJs(str) {
    return String(str)
        .replaceAll('\\', '\\\\')
        .replaceAll("'", "\\'")
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n')
        .replaceAll('\r', '\\r');
}

