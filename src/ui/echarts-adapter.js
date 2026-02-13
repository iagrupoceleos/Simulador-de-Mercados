/**
 * Prometheus Tech Scout – Apache ECharts Integration (SCOUT-005)
 * Adapter layer for using ECharts as an alternative chart renderer.
 * NOTE: Requires external dep. CDN-based lazy loading.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ECharts Adapter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let echartsLoaded = false;

/**
 * Lazy-load ECharts from CDN.
 */
async function loadECharts() {
    if (echartsLoaded || typeof window.echarts !== 'undefined') return;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js';
        script.onload = () => { echartsLoaded = true; resolve(); };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Create a professional dark-theme ECharts instance.
 * @param {HTMLElement} container
 * @returns {Promise<object>} ECharts instance
 */
export async function createChart(container) {
    await loadECharts();

    // Register dark theme
    window.echarts.registerTheme('prometheus', {
        backgroundColor: '#0f0f1a',
        color: ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#8b5cf6'],
        textStyle: { color: '#a0aec0' },
    });

    return window.echarts.init(container, 'prometheus', { renderer: 'canvas' });
}

/**
 * Render a line chart for weekly time series.
 * @param {HTMLElement} container
 * @param {object} data - { weeks, series: [{ name, values }] }
 */
export async function renderLineChart(container, data) {
    const chart = await createChart(container);

    chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: data.series.map(s => s.name), top: 10, textStyle: { color: '#a0aec0' } },
        grid: { left: 60, right: 20, bottom: 30, top: 50 },
        xAxis: { type: 'category', data: data.weeks.map(w => `S${w}`), axisLine: { lineStyle: { color: '#2a2a4a' } } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a1a2e' } } },
        series: data.series.map(s => ({
            name: s.name,
            type: 'line',
            data: s.values,
            smooth: true,
            areaStyle: { opacity: 0.1 },
        })),
    });

    return chart;
}

/**
 * Render a radar chart for strategic positioning.
 * @param {HTMLElement} container
 * @param {object} data - { indicators: [{name, max}], values: number[] }
 */
export async function renderRadarChart(container, data) {
    const chart = await createChart(container);

    chart.setOption({
        radar: {
            indicator: data.indicators,
            shape: 'polygon',
            splitArea: { areaStyle: { color: ['#0f0f1a', '#131332'] } },
            axisLine: { lineStyle: { color: '#2a2a4a' } },
            splitLine: { lineStyle: { color: '#1a1a2e' } },
        },
        series: [{
            type: 'radar',
            data: [{ value: data.values, areaStyle: { opacity: 0.3 } }],
        }],
    });

    return chart;
}

/**
 * Render a bar chart for distributions/histograms.
 * @param {HTMLElement} container
 * @param {object} data - { labels, values, title }
 */
export async function renderBarChart(container, data) {
    const chart = await createChart(container);

    chart.setOption({
        title: { text: data.title || '', left: 'center', textStyle: { color: '#a0aec0', fontSize: 14 } },
        tooltip: { trigger: 'axis' },
        grid: { left: 60, right: 20, bottom: 30, top: 40 },
        xAxis: { type: 'category', data: data.labels, axisLabel: { rotate: 30, color: '#a0aec0' } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a1a2e' } } },
        series: [{ type: 'bar', data: data.values, barWidth: '60%', itemStyle: { borderRadius: [4, 4, 0, 0] } }],
    });

    return chart;
}

/**
 * Render a horizontal bar chart (tornado).
 * @param {HTMLElement} container
 * @param {object} data - { labels, lowValues, highValues, title }
 */
export async function renderTornadoChart(container, data) {
    const chart = await createChart(container);

    chart.setOption({
        title: { text: data.title || 'Tornado', left: 'center', textStyle: { color: '#a0aec0', fontSize: 14 } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: 120, right: 30, bottom: 20, top: 40 },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a1a2e' } } },
        yAxis: { type: 'category', data: data.labels, axisLabel: { color: '#a0aec0' } },
        series: [
            { name: 'Bajo', type: 'bar', stack: 'total', data: data.lowValues, itemStyle: { color: '#f43f5e' } },
            { name: 'Alto', type: 'bar', stack: 'total', data: data.highValues, itemStyle: { color: '#10b981' } },
        ],
    });

    return chart;
}

/**
 * Check if ECharts is loaded.
 */
export function isEChartsReady() {
    return typeof window.echarts !== 'undefined';
}
