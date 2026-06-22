/* ============================================================
   Reports Page - PDF (print-ready tab) / Excel (.xls download)
   ============================================================ */

async function renderReportsPage(container) {
    container.innerHTML = `
        <div class="card" style="margin-bottom:18px;">
            <div class="card-header"><h3>Report Period</h3></div>
            <div class="card-body" style="display:flex; gap:14px; align-items:flex-end;">
                <div class="form-group" style="margin:0;"><label>From</label><input type="date" id="reportFrom" value="${daysAgoISO(30)}" /></div>
                <div class="form-group" style="margin:0;"><label>To</label><input type="date" id="reportTo" value="${todayISO()}" /></div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
            <div class="card">
                <div class="card-header"><h3>Sales Report</h3></div>
                <div class="card-body">
                    <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">Every transaction in the selected period — cashier, total, payment method, and status.</p>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-outline" onclick="openReportPdf('sales')">🖨 PDF (Print)</button>
                        <button class="btn btn-outline" onclick="downloadReport('sales', 'excel')">⬇ Excel</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>Profit &amp; Loss</h3></div>
                <div class="card-body">
                    <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">Revenue, cost of goods sold, gross and net profit, plus expense breakdown.</p>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-outline" onclick="openReportPdf('pnl')">🖨 PDF (Print)</button>
                        <button class="btn btn-outline" onclick="downloadReport('pnl', 'excel')">⬇ Excel</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>Inventory Report</h3></div>
                <div class="card-body">
                    <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">Current stock levels, stock value, and nearest expiry per product.</p>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-outline" onclick="openReportPdf('inventory')">🖨 PDF (Print)</button>
                        <button class="btn btn-outline" onclick="downloadReport('inventory', 'excel')">⬇ Excel</button>
                    </div>
                </div>
            </div>
        </div>

        <p style="font-size:12px; color:var(--text-muted); margin-top:18px;">
            💡 "PDF (Print)" opens a print-ready page in a new tab — use your browser's Print dialog and choose "Save as PDF" as the destination.
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
        showToast('Preparing your report...');
        if (type === 'sales') {
            await Api.downloadSalesExcel(from, to);
        } else if (type === 'pnl') {
            await Api.downloadPnlExcel(from, to);
        } else if (type === 'inventory') {
            await Api.downloadInventoryExcel();
        }
        showToast('Report downloaded successfully');
    } catch (err) {
        showError(err);
    }
}
