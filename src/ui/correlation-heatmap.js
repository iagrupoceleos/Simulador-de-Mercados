/**
 * Prometheus UI – Correlation Heatmap (DS-008)
 * Multi-variable correlation matrix rendered as color-coded heatmap using Canvas.
 */

import { correlation } from '../engine/statistics.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Correlation Matrix
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute a correlation matrix from a set of named variables.
 * @param {object} variables - { name: number[] }
 * @returns {object} { names, matrix, significantPairs }
 */
export function computeCorrelationMatrix(variables) {
    const names = Object.keys(variables);
    const n = names.length;
    const matrix = [];

    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                row.push(1.0);
            } else if (j < i) {
                row.push(matrix[j][i]); // symmetric
            } else {
                row.push(correlation(variables[names[i]], variables[names[j]]));
            }
        }
        matrix.push(row);
    }

    // Find significant correlations (|r| > 0.5)
    const significantPairs = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const r = matrix[i][j];
            if (Math.abs(r) > 0.5) {
                significantPairs.push({
                    var1: names[i],
                    var2: names[j],
                    r: Math.round(r * 1000) / 1000,
                    strength: Math.abs(r) > 0.8 ? 'fuerte' : 'moderada',
                    direction: r > 0 ? 'positiva' : 'negativa',
                });
            }
        }
    }

    significantPairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    return { names, matrix, significantPairs };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Heatmap Renderer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render a correlation heatmap using Canvas.
 * @param {HTMLElement} container
 * @param {object} corr - from computeCorrelationMatrix()
 * @param {object} [options]
 */
export function renderCorrelationHeatmap(container, corr, options = {}) {
    if (!container || !corr) return;

    const { cellSize = 60, fontSize = 11 } = options;
    const n = corr.names.length;
    const labelMargin = 80;
    const totalSize = labelMargin + n * cellSize;

    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    canvas.width = totalSize;
    canvas.height = totalSize;
    canvas.style.maxWidth = '100%';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, totalSize, totalSize);

    // Draw cells
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const r = corr.matrix[i][j];
            const x = labelMargin + j * cellSize;
            const y = labelMargin + i * cellSize;

            ctx.fillStyle = correlationColor(r);
            ctx.fillRect(x, y, cellSize - 1, cellSize - 1);

            // Value text
            ctx.fillStyle = Math.abs(r) > 0.5 ? '#fff' : '#aaa';
            ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(r.toFixed(2), x + cellSize / 2, y + cellSize / 2);
        }
    }

    // Row labels
    ctx.fillStyle = '#e0e0ff';
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
        ctx.fillText(
            truncate(corr.names[i], 10),
            labelMargin - 8,
            labelMargin + i * cellSize + cellSize / 2
        );
    }

    // Column labels (rotated)
    ctx.save();
    ctx.textAlign = 'left';
    for (let j = 0; j < n; j++) {
        ctx.save();
        ctx.translate(labelMargin + j * cellSize + cellSize / 2, labelMargin - 8);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = '#e0e0ff';
        ctx.fillText(truncate(corr.names[j], 10), 0, 0);
        ctx.restore();
    }
    ctx.restore();

    // Significant pairs summary
    if (corr.significantPairs.length > 0) {
        const summary = document.createElement('div');
        summary.style.cssText = 'margin-top:12px; font-size:13px; color:var(--text-secondary);';
        summary.innerHTML = `
            <strong style="color:var(--text-primary);">Correlaciones significativas:</strong><br>
            ${corr.significantPairs.slice(0, 5).map(p =>
            `<span style="color:${p.r > 0 ? '#10b981' : '#ef4444'}">
                    ${p.var1} ↔ ${p.var2}: r=${p.r} (${p.strength} ${p.direction})
                </span>`
        ).join('<br>')}
        `;
        container.appendChild(summary);
    }
}

// ━━━━━━━━━━ Helpers ━━━━━━━━━━

function correlationColor(r) {
    // Blue for negative, red for positive, gray for zero
    const intensity = Math.min(255, Math.round(Math.abs(r) * 255));
    if (r > 0) return `rgb(${intensity}, ${Math.round(intensity * 0.3)}, ${Math.round(intensity * 0.3)})`;
    if (r < 0) return `rgb(${Math.round(intensity * 0.3)}, ${Math.round(intensity * 0.3)}, ${intensity})`;
    return `rgb(40, 40, 60)`;
}

function truncate(str, max) {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
