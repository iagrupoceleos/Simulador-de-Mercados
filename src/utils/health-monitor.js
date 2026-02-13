/**
 * Prometheus – Health Monitor (PROD-002)
 * Runtime health checks: memory, performance, connectivity, and system vitals.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Health Checks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Run all health checks and return a status report.
 * @returns {object} health report
 */
export function runHealthCheck() {
    const checks = {
        memory: checkMemory(),
        performance: checkPerformance(),
        storage: checkStorage(),
        browser: checkBrowser(),
    };

    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
    const hasWarning = Object.values(checks).some(c => c.status === 'warning');

    return {
        timestamp: new Date().toISOString(),
        overall: allHealthy ? 'healthy' : hasWarning ? 'degraded' : 'unhealthy',
        checks,
        uptime: Math.round(performance.now() / 1000),
    };
}

function checkMemory() {
    if (!performance.memory) {
        return { status: 'unknown', message: 'API no disponible' };
    }

    const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const usagePct = usedJSHeapSize / jsHeapSizeLimit;
    const usedMB = Math.round(usedJSHeapSize / 1048576);
    const limitMB = Math.round(jsHeapSizeLimit / 1048576);

    return {
        status: usagePct > 0.9 ? 'critical' : usagePct > 0.7 ? 'warning' : 'healthy',
        usedMB,
        limitMB,
        usagePct: Math.round(usagePct * 100),
        message: `${usedMB}MB / ${limitMB}MB (${Math.round(usagePct * 100)}%)`,
    };
}

function checkPerformance() {
    const entries = performance.getEntriesByType('navigation');
    const nav = entries[0];
    if (!nav) return { status: 'unknown', message: 'Sin métricas de navegación' };

    const loadTime = Math.round(nav.loadEventEnd - nav.startTime);
    const domReady = Math.round(nav.domContentLoadedEventEnd - nav.startTime);

    return {
        status: loadTime > 5000 ? 'warning' : 'healthy',
        loadTimeMs: loadTime,
        domReadyMs: domReady,
        message: `Carga: ${loadTime}ms, DOM: ${domReady}ms`,
    };
}

function checkStorage() {
    try {
        const test = '__health_check__';
        localStorage.setItem(test, '1');
        localStorage.removeItem(test);

        let usedBytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            usedBytes += (key.length + localStorage.getItem(key).length) * 2;
        }
        const usedKB = Math.round(usedBytes / 1024);
        const estimatedLimitKB = 5120; // ~5MB

        return {
            status: usedKB > estimatedLimitKB * 0.8 ? 'warning' : 'healthy',
            usedKB,
            estimatedLimitKB,
            items: localStorage.length,
            message: `${usedKB}KB usado, ${localStorage.length} items`,
        };
    } catch (e) {
        return { status: 'critical', message: `LocalStorage error: ${e.message}` };
    }
}

function checkBrowser() {
    const features = {
        webWorkers: typeof Worker !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        indexedDB: typeof indexedDB !== 'undefined',
        canvas: !!document.createElement('canvas').getContext,
        localStorage: (() => { try { localStorage; return true; } catch { return false; } })(),
    };

    const supported = Object.values(features).filter(Boolean).length;
    const total = Object.keys(features).length;

    return {
        status: supported === total ? 'healthy' : supported >= total - 1 ? 'warning' : 'critical',
        features,
        supportedCount: `${supported}/${total}`,
        userAgent: navigator.userAgent.slice(0, 80),
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Health UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render health status badge.
 * @param {HTMLElement} container
 */
export function renderHealthBadge(container) {
    if (!container) return;

    const report = runHealthCheck();
    const colors = { healthy: '#10b981', degraded: '#f59e0b', unhealthy: '#ef4444', unknown: '#666' };
    const icons = { healthy: '🟢', degraded: '🟡', unhealthy: '🔴', unknown: '⚪' };

    container.innerHTML = `
        <div style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px;
            border-radius:12px; background:${colors[report.overall]}22;
            border:1px solid ${colors[report.overall]}44; font-size:12px; cursor:pointer;"
            title="Uptime: ${report.uptime}s&#10;${Object.entries(report.checks).map(([k, v]) => `${k}: ${v.status}`).join('&#10;')}">
            ${icons[report.overall]} ${report.overall.toUpperCase()}
        </div>
    `;
}
