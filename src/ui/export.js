/**
 * Prometheus UI – Export Utilities (UX-005)
 * Export simulation results as CSV, JSON, or trigger print (PDF).
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CSV Export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Export weekly metrics as CSV.
 * @param {Array} weeklyAvg - from MC results
 * @param {string} [filename='prometheus_weekly.csv']
 */
export function exportWeeklyCSV(weeklyAvg, filename = 'prometheus_weekly.csv') {
    if (!weeklyAvg || weeklyAvg.length === 0) return;

    const headers = ['Semana', 'Unidades Vendidas', 'Acumulado', 'Inventario', 'Ingresos', 'Conversión', 'Atractividad Comp.'];
    const rows = weeklyAvg.map(w => [
        w.week + 1,
        w.unitsSold.toFixed(0),
        w.cumulativeSold.toFixed(0),
        w.inventory.toFixed(0),
        w.revenue.toFixed(2),
        (w.avgConversion * 100).toFixed(2),
        w.competitorAttractiveness.toFixed(3),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csv, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export KPI summary as CSV.
 * @param {object} mcResults
 * @param {string} [filename='prometheus_kpis.csv']
 */
export function exportKPIsCSV(mcResults, filename = 'prometheus_kpis.csv') {
    if (!mcResults) return;

    const kpis = ['sales', 'revenue', 'grossProfit', 'netProfit', 'roi', 'margin',
        'inventoryRemaining', 'inventoryValue', 'unsoldPct'];
    const headers = ['KPI', 'Media', 'Mediana', 'P5', 'P95', 'StdDev', 'Min', 'Max'];
    const rows = kpis.map(k => {
        const s = mcResults[k];
        if (!s) return [k, '', '', '', '', '', '', ''];
        return [k, s.mean.toFixed(2), s.p50.toFixed(2), s.p5.toFixed(2),
            s.p95.toFixed(2), s.std.toFixed(2), s.min.toFixed(2), s.max.toFixed(2)];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csv, filename, 'text/csv;charset=utf-8;');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  JSON Export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Export full results as JSON.
 * @param {object} mcResults
 * @param {string} [filename='prometheus_results.json']
 */
export function exportResultsJSON(mcResults, filename = 'prometheus_results.json') {
    if (!mcResults) return;

    // Strip rawResults to reduce file size
    const { rawResults, distributions, ...summary } = mcResults;
    const json = JSON.stringify(summary, null, 2);
    downloadBlob(json, filename, 'application/json');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PNG Export (chart canvas)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Export a canvas element as PNG.
 * @param {HTMLCanvasElement} canvas
 * @param {string} [filename='chart.png']
 */
export function exportCanvasPNG(canvas, filename = 'chart.png') {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PDF Export (browser print)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Trigger browser print dialog for PDF export.
 */
export function exportAsPDF() {
    window.print();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
