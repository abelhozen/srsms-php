/* ============================================================
   Reports Page - PDF (print-ready tab) / Excel (.xls download)
   ============================================================ */

async function renderReportsPage(container) {
    container.innerHTML = `
        <div class="card" style="margin-bottom:18px;">
            <div class="card-header"><h3>Kipindi cha Ripoti</h3></div>
            <div class="card-body" style="display:flex; gap:14px; align-items:flex-end;">
                <div class="form-group" style="margin:0;"><label>Tangu</label><input type="date" id="reportFrom" value="${daysAgoISO(30)}" /></div>
                <div class="form-group" style="margin:0;"><label>Hadi</label><input type="date" id="reportTo" value="${todayISO()}" /></div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
            <div class="card">
                <div class="card-header"><h3>Ripoti ya Mauzo</h3></div>
                <div class="card-body">
                    <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">Kila muamala katika kipindi kilichochaguliwa — mkasishaji, jumla, njia ya malipo, na hali.</p>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-outline" onclick="openReportPdf('sales')">🖨 PDF (Chapisha)</button>
                        <button class="btn btn-outline" onclick="downloadReport('sales', 'excel')">⬇ Excel</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>Faida na Gharama</h3></div>
                <div class="card-body">
                    <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">Mapato, gharama ya bidhaa zilizouzwa, faida ya kawaida na halisi, pamoja na muhtasari wa matumizi.</p>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-outline" onclick="openReportPdf('pnl')">🖨 PDF (Chapisha)</button>
                        <button class="btn btn-outline" onclick="downloadReport('pnl', 'excel')">⬇ Excel</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>Ripoti ya Hisa</h3></div>
                <div class="card-body">
                    <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">Kiwango cha hisa ya sasa, thamani ya hisa, na tarehe ya kuisha muda karibu kwa kila bidhaa.</p>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-outline" onclick="openReportPdf('inventory')">🖨 PDF (Chapisha)</button>
                        <button class="btn btn-outline" onclick="downloadReport('inventory', 'excel')">⬇ Excel</button>
                    </div>
                </div>
            </div>
        </div>

        <p style="font-size:12px; color:var(--text-muted); margin-top:18px;">
            💡 "PDF (Chapisha)" hufungua ukurasa wa maandishi ya kuchapisha kwenye kichupo kipya — tumia kisanduku cha kuchapisha cha kivinjari chako na uchague "Hifadhi kama PDF" kama eneo lengwa.
        </p>
    `;
}

function openReportPdf(type) {
    const from = document.getElementById('reportFrom')?.value || daysAgoISO(30);
    const to = document.getElementById('reportTo')?.value || todayISO();

    if (type === 'sales') Api.openSalesPdf(from, to);
    else if (type === 'pnl') Api.openPnlPdf(from, to);
    else if (type === 'inventory') Api.openInventoryPdf();
}

async function downloadReport(type, format) {
    const from = document.getElementById('reportFrom')?.value || daysAgoISO(30);
    const to = document.getElementById('reportTo')?.value || todayISO();

    try {
        showToast('Inatayarisha ripoti yako...');
        if (type === 'sales') {
            await Api.downloadSalesExcel(from, to);
        } else if (type === 'pnl') {
            await Api.downloadPnlExcel(from, to);
        } else if (type === 'inventory') {
            await Api.downloadInventoryExcel();
        }
        showToast('Ripoti imepakuliwa kwa mafanikio');
    } catch (err) {
        showError(err);
    }
}
