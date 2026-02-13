/**
 * Prometheus Engine – Bundle Size Analysis (DEV-006)
 * Produces a build report with per-module size breakdown.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Bundle Analyzer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Module categories for analysis.
 */
const MODULE_CATEGORIES = {
    'engine': { pattern: /src\/engine\//, label: 'Motor de Simulación' },
    'ui': { pattern: /src\/ui\//, label: 'Interfaz de Usuario' },
    'views': { pattern: /src\/ui\/views\//, label: 'Vistas' },
    'vendor': { pattern: /node_modules\//, label: 'Dependencias' },
};

/**
 * Analyze module sizes from Vite's build output.
 * @param {Object<string, { code: string }>} modules - Vite's module map
 * @returns {object} analysis report
 */
export function analyzeBundle(modules) {
    if (!modules || typeof modules !== 'object') return null;

    const entries = Object.entries(modules).map(([path, info]) => {
        const size = typeof info === 'object' ? (info.code?.length || 0) : 0;
        const category = Object.entries(MODULE_CATEGORIES)
            .find(([, cat]) => cat.pattern.test(path))?.[0] || 'other';
        return { path, size, category };
    });

    // Group by category
    const byCategory = {};
    for (const entry of entries) {
        if (!byCategory[entry.category]) {
            byCategory[entry.category] = {
                label: MODULE_CATEGORIES[entry.category]?.label || 'Otros',
                modules: [],
                totalSize: 0,
            };
        }
        byCategory[entry.category].modules.push(entry);
        byCategory[entry.category].totalSize += entry.size;
    }

    const totalSize = entries.reduce((s, e) => s + e.size, 0);

    // Top 10 largest
    const top10 = entries
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map(e => ({
            path: e.path.replace(/.*\/src\//, 'src/'),
            size: e.size,
            pct: ((e.size / totalSize) * 100).toFixed(1),
        }));

    return {
        totalModules: entries.length,
        totalSize,
        totalKB: (totalSize / 1024).toFixed(1),
        byCategory,
        top10,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Format bundle analysis as a console-friendly report.
 * @param {object} analysis
 * @returns {string}
 */
export function formatBundleReport(analysis) {
    if (!analysis) return 'No analysis data available.';

    const lines = [
        `\n📦 Prometheus – Análisis de Bundle`,
        `${'═'.repeat(50)}`,
        `Total: ${analysis.totalKB} KB (${analysis.totalModules} módulos)`,
        ``,
        `Por Categoría:`,
    ];

    for (const [, cat] of Object.entries(analysis.byCategory)) {
        const pct = ((cat.totalSize / analysis.totalSize) * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(pct / 5));
        lines.push(`  ${cat.label.padEnd(25)} ${(cat.totalSize / 1024).toFixed(1).padStart(8)} KB  ${bar} ${pct}%`);
    }

    lines.push('', 'Top 10 Módulos:');
    for (const mod of analysis.top10) {
        lines.push(`  ${mod.path.padEnd(40)} ${(mod.size / 1024).toFixed(1).padStart(8)} KB  (${mod.pct}%)`);
    }

    return lines.join('\n');
}

/**
 * Vite plugin for bundle analysis.
 * Use in vite.config.js: plugins: [bundleAnalyzerPlugin()]
 */
export function bundleAnalyzerPlugin() {
    return {
        name: 'prometheus-bundle-analyzer',
        generateBundle(_, bundle) {
            const modules = {};
            for (const [fileName, chunk] of Object.entries(bundle)) {
                if (chunk.type === 'chunk') {
                    modules[fileName] = { code: chunk.code || '' };
                }
            }
            const analysis = analyzeBundle(modules);
            if (analysis) {
                console.log(formatBundleReport(analysis));
            }
        },
    };
}
