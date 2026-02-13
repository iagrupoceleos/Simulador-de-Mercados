/**
 * Prometheus UI – Charts Module
 * Chart.js wrapper functions for all result visualizations.
 */
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// ---- Chart.js Global Defaults ----
Chart.defaults.color = '#9498a8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = '#1a1a24';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
Chart.defaults.elements.point.radius = 0;
Chart.defaults.elements.point.hoverRadius = 5;
Chart.defaults.elements.line.tension = 0.35;
Chart.defaults.elements.line.borderWidth = 2;
Chart.defaults.animation.duration = 800;
Chart.defaults.animation.easing = 'easeOutQuart';

const COLORS = {
    cyan: '#00e5ff',
    violet: '#b388ff',
    amber: '#ffab40',
    rose: '#ff5370',
    emerald: '#69f0ae',
    cyanDim: 'rgba(0, 229, 255, 0.15)',
    violetDim: 'rgba(179, 136, 255, 0.15)',
    amberDim: 'rgba(255, 171, 64, 0.15)',
};

/** Store chart instances for cleanup */
const chartInstances = new Map();

function destroyChart(id) {
    if (chartInstances.has(id)) {
        chartInstances.get(id).destroy();
        chartInstances.delete(id);
    }
}

function createChart(canvasId, config) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const chart = new Chart(canvas.getContext('2d'), config);
    chartInstances.set(canvasId, chart);
    return chart;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Sales Projection Line Chart
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function renderSalesProjection(canvasId, weeklyAvg, mcResults) {
    const labels = weeklyAvg.map(w => `S${w.week + 1}`);
    const avgSales = weeklyAvg.map(w => w.cumulativeSold);

    // Approximate P10/P90 bands from raw results
    const rawResults = mcResults.rawResults;
    const weeks = weeklyAvg.length;
    const p10 = [], p90 = [];
    for (let w = 0; w < weeks; w++) {
        const vals = rawResults.map(r => r.weeklyMetrics[w]?.cumulativeSold ?? 0).sort((a, b) => a - b);
        p10.push(vals[Math.floor(vals.length * 0.1)]);
        p90.push(vals[Math.floor(vals.length * 0.9)]);
    }

    return createChart(canvasId, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'P90 (Optimista)',
                    data: p90,
                    borderColor: COLORS.emerald,
                    backgroundColor: 'rgba(105, 240, 174, 0.05)',
                    borderDash: [4, 4],
                    fill: false,
                },
                {
                    label: 'P50 (Promedio)',
                    data: avgSales,
                    borderColor: COLORS.cyan,
                    backgroundColor: COLORS.cyanDim,
                    borderWidth: 3,
                    fill: false,
                },
                {
                    label: 'P10 (Pesimista)',
                    data: p10,
                    borderColor: COLORS.rose,
                    backgroundColor: 'rgba(255, 83, 112, 0.05)',
                    borderDash: [4, 4],
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 16 } },
                tooltip: { mode: 'index', intersect: false },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Unidades Vendidas (acumulado)', color: '#5c6070' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                },
                x: {
                    title: { display: true, text: 'Semana', color: '#5c6070' },
                    grid: { display: false },
                },
            },
        },
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Distribution Histogram
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function renderHistogram(canvasId, data, { title = '', color = COLORS.cyan, bins = 30, varLine = null } = {}) {
    const sorted = [...data].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const binWidth = (max - min) / bins || 1;

    const buckets = Array(bins).fill(0);
    const labels = [];
    for (let i = 0; i < bins; i++) {
        const lo = min + i * binWidth;
        labels.push(formatNumber(lo));
        for (const v of data) {
            if (v >= lo && v < lo + binWidth) buckets[i]++;
        }
    }

    const datasets = [{
        label: title,
        data: buckets,
        backgroundColor: color.replace(')', ', 0.4)').replace('rgb', 'rgba'),
        borderColor: color,
        borderWidth: 1,
        borderRadius: 3,
    }];

    const annotation = varLine ? {
        plugins: {
            annotation: {
                annotations: {
                    varLine: {
                        type: 'line',
                        xMin: varLine.index,
                        xMax: varLine.index,
                        borderColor: COLORS.rose,
                        borderWidth: 2,
                        label: { content: varLine.label, display: true },
                    },
                },
            },
        },
    } : {};

    return createChart(canvasId, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Frecuencia' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                },
                x: {
                    title: { display: true, text: title },
                    grid: { display: false },
                    ticks: { maxTicksLimit: 8 },
                },
            },
            ...annotation,
        },
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Inventory Level Over Time
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function renderInventoryTimeline(canvasId, weeklyAvg) {
    const labels = weeklyAvg.map(w => `S${w.week + 1}`);

    return createChart(canvasId, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Inventario Restante',
                    data: weeklyAvg.map(w => w.inventory),
                    borderColor: COLORS.amber,
                    backgroundColor: COLORS.amberDim,
                    fill: true,
                    borderWidth: 2,
                },
                {
                    label: 'Ventas Semanales',
                    data: weeklyAvg.map(w => w.unitsSold),
                    borderColor: COLORS.cyan,
                    backgroundColor: COLORS.cyanDim,
                    fill: false,
                    borderWidth: 2,
                    yAxisID: 'y1',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 16 } },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Inventario' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                },
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    title: { display: true, text: 'Ventas/Semana' },
                    grid: { display: false },
                },
                x: { grid: { display: false } },
            },
        },
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Competitor Price Comparison
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function renderCompetitorPrices(canvasId, weeklyAvg, competitorNames) {
    const labels = weeklyAvg.map(w => `S${w.week + 1}`);
    const colors = [COLORS.rose, COLORS.violet, COLORS.amber, COLORS.emerald];

    const datasets = [
        {
            label: 'Nuestro Precio',
            data: weeklyAvg.map(w => w.ourPrice ?? 149),
            borderColor: COLORS.cyan,
            borderWidth: 3,
        },
    ];

    // Competitor prices would come from averaged competitor data
    // For now show our price only since we average across iterations
    return createChart(canvasId, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top', labels: { boxWidth: 12 } },
            },
            scales: {
                y: {
                    title: { display: true, text: 'Precio (€)' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                },
                x: { grid: { display: false } },
            },
        },
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Risk Scatter (Margin vs Inventory)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function renderRiskScatter(canvasId, mcResults) {
    const points = mcResults.rawResults.slice(0, 200).map(r => ({
        x: r.marginPct,
        y: r.unsoldPct,
    }));

    return createChart(canvasId, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Escenarios Simulados',
                data: points,
                backgroundColor: 'rgba(0, 229, 255, 0.3)',
                borderColor: COLORS.cyan,
                pointRadius: 3,
                pointHoverRadius: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Margen: ${ctx.parsed.x.toFixed(1)}% | Inv. No Vendido: ${ctx.parsed.y.toFixed(1)}%`,
                    },
                },
            },
            scales: {
                x: {
                    title: { display: true, text: 'Margen Bruto (%)' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                },
                y: {
                    title: { display: true, text: 'Inventario No Vendido (%)' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                },
            },
        },
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Mini Distribution Preview (for NGC interface)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function renderMiniDistribution(canvasId, distribution, { color = COLORS.violet, points = 60 } = {}) {
    const samples = distribution.sampleN(2000);
    const sorted = [...samples].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const bins = points;
    const binWidth = (max - min) / bins || 0.01;

    const buckets = Array(bins).fill(0);
    const labels = [];
    for (let i = 0; i < bins; i++) {
        const lo = min + i * binWidth;
        labels.push('');
        for (const v of samples) {
            if (v >= lo && v < lo + binWidth) buckets[i]++;
        }
    }

    return createChart(canvasId, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: buckets,
                backgroundColor: color.replace(')', ', 0.3)').replace('rgb', 'rgba'),
                borderColor: color,
                borderWidth: 1,
                borderRadius: 2,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                y: { display: false },
                x: { display: false },
            },
            animation: { duration: 400 },
        },
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Stock Scenarios Bar Chart
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function renderStockScenarios(canvasId, scenarios) {
    return createChart(canvasId, {
        type: 'bar',
        data: {
            labels: scenarios.map(s => s.label),
            datasets: [
                {
                    label: 'Costo Sobrestock',
                    data: scenarios.map(s => s.overstockCost),
                    backgroundColor: COLORS.rose + '99',
                    borderRadius: 4,
                },
                {
                    label: 'Costo Ventas Perdidas',
                    data: scenarios.map(s => s.lostSalesCost),
                    backgroundColor: COLORS.amber + '99',
                    borderRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top', labels: { boxWidth: 12 } },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Costo (€)' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    stacked: true,
                },
                x: { stacked: true, grid: { display: false } },
            },
        },
    });
}

// ---- Utility ----
function formatNumber(n) {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toFixed(0);
}

export function destroyAllCharts() {
    for (const [id, chart] of chartInstances) {
        chart.destroy();
    }
    chartInstances.clear();
}
