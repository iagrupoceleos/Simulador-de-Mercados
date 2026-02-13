/**
 * Prometheus Tech Scout – SheetJS Excel/CSV Export (SCOUT-003)
 * Wrapper for SheetJS (xlsx) for structured spreadsheet exports.
 * NOTE: Requires external dep. Provides CDN-based lazy loading.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SheetJS Integration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let xlsxLoaded = false;

/**
 * Lazy-load SheetJS from CDN.
 */
async function loadXLSX() {
    if (xlsxLoaded || typeof window.XLSX !== 'undefined') return;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
        script.onload = () => { xlsxLoaded = true; resolve(); };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Export MC results to Excel workbook with multiple sheets.
 * @param {object} mcResults
 * @param {string} [filename='prometheus-results.xlsx']
 */
export async function exportToExcel(mcResults, filename = 'prometheus-results.xlsx') {
    await loadXLSX();
    const XLSX = window.XLSX;

    const wb = XLSX.utils.book_new();

    // Sheet 1: KPI Summary
    const kpiData = [
        ['KPI', 'Media', 'Std', 'Min', 'P5', 'Mediana', 'P95', 'Max'],
    ];

    const kpiFields = ['sales', 'revenue', 'grossProfit', 'netProfit', 'roi', 'margin', 'inventoryRemaining', 'unsoldPct'];
    for (const field of kpiFields) {
        const stats = mcResults[field];
        if (stats) {
            kpiData.push([
                field,
                stats.mean, stats.std, stats.min, stats.p5, stats.p50, stats.p95, stats.max,
            ]);
        }
    }

    const wsKPI = XLSX.utils.aoa_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKPI, 'Resumen KPIs');

    // Sheet 2: Weekly Averages
    if (mcResults.weeklyAvg) {
        const weeklyData = [
            ['Semana', 'Ventas', 'Ventas Acum.', 'Inventario', 'Ingreso', 'Conversión'],
            ...mcResults.weeklyAvg.map(w => [
                w.week, w.unitsSold, w.cumulativeSold, w.inventory, w.revenue, w.avgConversion,
            ]),
        ];
        const wsWeekly = XLSX.utils.aoa_to_sheet(weeklyData);
        XLSX.utils.book_append_sheet(wb, wsWeekly, 'Semanal');
    }

    // Sheet 3: Raw Results
    if (mcResults.rawResults && mcResults.rawResults.length > 0) {
        const rawHeaders = Object.keys(mcResults.rawResults[0]);
        const rawData = [
            rawHeaders,
            ...mcResults.rawResults.slice(0, 1000).map(r => rawHeaders.map(h => r[h])),
        ];
        const wsRaw = XLSX.utils.aoa_to_sheet(rawData);
        XLSX.utils.book_append_sheet(wb, wsRaw, 'Iteraciones');
    }

    // Download
    XLSX.writeFile(wb, filename);
}

/**
 * Export array of objects to CSV.
 * @param {object[]} data
 * @param {string} [filename='export.csv']
 */
export async function exportToCSVAdvanced(data, filename = 'export.csv') {
    await loadXLSX();
    const XLSX = window.XLSX;

    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Import CSV/Excel file and return parsed data.
 * @param {File} file
 * @returns {Promise<{ headers: string[], rows: object[] }>}
 */
export async function importSpreadsheet(file) {
    await loadXLSX();
    const XLSX = window.XLSX;

    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(firstSheet);

    return {
        headers: json.length > 0 ? Object.keys(json[0]) : [],
        rows: json,
        sheetNames: wb.SheetNames,
    };
}

/**
 * Check if SheetJS is loaded.
 */
export function isXLSXReady() {
    return typeof window.XLSX !== 'undefined';
}
