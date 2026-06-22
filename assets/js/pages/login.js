/* ============================================================
   Login Page
   ============================================================ */

function renderLogin() {
    document.getElementById('root').innerHTML = `
        <div class="login-screen">
            <div class="login-brand">
                <div class="ledger-mark">S</div>
                <h1>Run the shop on real numbers, not guesswork.</h1>
                <p>SRSMS brings POS, batch inventory, and live profit tracking into one ledger — built for shops that need to know exactly where every shilling went.</p>
                <div class="login-stats">
                    <div>
                        <div class="stat-num">6</div>
                        <div class="stat-label">User Roles</div>
                    </div>
                    <div>
                        <div class="stat-num">FIFO</div>
                        <div class="stat-label">Batch Tracking</div>
                    </div>
                    <div>
                        <div class="stat-num">Live</div>
                        <div class="stat-label">P&amp;L Engine</div>
                    </div>
                </div>
            </div>
            <div class="login-panel">
                <h2>Sign in</h2>
                <p class="login-sub">Enter your username and password to access your dashboard.</p>
                <div class="login-error" id="loginError"></div>
                <form id="loginForm">
                    <div class="field-group">
                        <label for="loginUsername">Username or Email</label>
                        <input type="text" id="loginUsername" autocomplete="username" required />
                    </div>
                    <div class="field-group">
                        <label for="loginPassword">Password</label>
                        <input type="password" id="loginPassword" autocomplete="current-password" required />
                    </div>
                    <button type="submit" class="btn-primary" id="loginSubmitBtn">Sign In</button>
                </form>
                <div class="login-demo-roles">
                    <p>System Roles</p>
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
    btn.textContent = 'Signing in...';

    try {
        const res = await Api.login(username, password);
        Store.user = res.user;
        await bootApp();
    } catch (err) {
        errorEl.textContent = err.message || 'Login failed. Please check your credentials.';
        errorEl.classList.add('show');
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}
