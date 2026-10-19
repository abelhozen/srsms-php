/* ============================================================
   Login Page
   ============================================================ */

function renderLogin() {
    document.getElementById('root').innerHTML = `
        <div class="login-screen">
            <div class="login-brand">
                <div class="ledger-mark">S</div>
                <h1>Endesha duka kwa namba za ukweli, si makisio.</h1>
                <p>SRSMS huleta POS, hisa za batch, na ufuatiliaji wa faida moja kwa moja kwenye mfumo mmoja — ulioundwa kwa maduka yanahitaji kujua kila shilingi iliyotumika.</p>
                <div class="login-stats">
                    <div>
                        <div class="stat-num">6</div>
                        <div class="stat-label">Majukumu ya Watumiaji</div>
                    </div>
                    <div>
                        <div class="stat-num">FIFO</div>
                        <div class="stat-label">Ufuatiliaji wa Batch</div>
                    </div>
                    <div>
                        <div class="stat-num">Live</div>
                        <div class="stat-label">Mfumo wa Faida na Gharama</div>
                    </div>
                </div>
            </div>
            <div class="login-panel">
                <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
                    <button class="btn btn-outline btn-sm" id="languageToggleBtn" type="button" onclick="toggleLanguage()" aria-label="Badili lugha">Kiswahili</button>
                </div>
                <h2>Ingia</h2>
                <p class="login-sub">Ingiza jina lako la mtumiaji na nenosiri ili kufikia dashibodi yako.</p>
                <div class="login-error" id="loginError"></div>
                <form id="loginForm">
                    <div class="field-group">
                        <label for="loginUsername">Jina la mtumiaji au Barua pepe</label>
                        <input type="text" id="loginUsername" autocomplete="username" required />
                    </div>
                    <div class="field-group">
                        <label for="loginPassword">Nenosiri</label>
                        <div style="position:relative;">
                            <input type="password" id="loginPassword" autocomplete="current-password" required style="padding-right:48px;" />
                            <button type="button" id="togglePasswordBtn" class="password-toggle-btn" aria-label="Show password">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="btn-primary" id="loginSubmitBtn">Ingia</button>
                </form>
                <div class="login-demo-roles">
                    <p>Majukumu ya Mfumo</p>
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        <span class="badge badge-gray">Super Admin</span>
                        <span class="badge badge-gray">Admin</span>
                        <span class="badge badge-gray">Cashier</span>
                        <span class="badge badge-gray">Store Keeper</span>
                        <span class="badge badge-gray">Accountant</span>
                        <span class="badge badge-gray">Auditor</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    setAppLanguage(getStoredLanguage());

    const pwdInput = document.getElementById('loginPassword');
    const toggleBtn = document.getElementById('togglePasswordBtn');
    if (pwdInput && toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = pwdInput.type === 'password';
            pwdInput.type = isHidden ? 'text' : 'password';
            toggleBtn.innerHTML = isHidden ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
            const label = isHidden ? 'Ficha nenosiri' : 'Onyesha nenosiri';
            toggleBtn.setAttribute('aria-label', label);
            if (getCurrentLanguage() === 'en') {
                toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
            }
        });
    }

    document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginSubmitBtn');

    errorEl.classList.remove('show');
    btn.disabled = true;
btn.textContent = 'Ingia...';

    try {
        const res = await Api.login(username, password);
        Store.user = res.user;
        await bootApp();
    } catch (err) {
        errorEl.textContent = err.message || 'Kuingia kumeishindikana. Tafadhali angalia taarifa zako.';
        errorEl.classList.add('show');
        btn.disabled = false;
        btn.textContent = 'Ingia';
    }
}
