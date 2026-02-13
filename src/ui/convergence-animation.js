/**
 * Prometheus UI – Monte Carlo Convergence Animation (DS-009)
 * Animated visualization of MC mean convergence using Canvas.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Convergence Animator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render an animated convergence chart.
 * @param {HTMLElement} container
 * @param {number[]} values - raw iteration values (e.g., profit per iteration)
 * @param {object} [options]
 */
export function renderConvergenceAnimation(container, values, options = {}) {
    if (!container || !values || values.length < 2) return;

    const { width = 600, height = 260, speed = 2, label = 'Convergencia MC' } = options;

    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.cssText = 'max-width:100%; border-radius:8px; background:#0a0a1a;';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const margin = { top: 30, right: 20, bottom: 30, left: 60 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    // Precompute running mean and CI bounds
    const data = precomputeConvergence(values);
    const yMin = Math.min(...data.map(d => d.lower));
    const yMax = Math.max(...data.map(d => d.upper));
    const yRange = yMax - yMin || 1;

    let currentFrame = 0;
    const totalFrames = data.length;
    let animId = null;

    function drawFrame() {
        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, width, height);

        // Title
        ctx.fillStyle = '#e0e0ff';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, margin.left, 18);

        // Iteration count
        ctx.textAlign = 'right';
        ctx.fillStyle = '#06b6d4';
        ctx.fillText(`Iteración ${currentFrame} / ${totalFrames}`, width - margin.right, 18);

        // Grid
        drawGrid(ctx, margin, plotW, plotH, yMin, yMax);

        // CI band
        ctx.beginPath();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
        for (let i = 0; i <= currentFrame; i++) {
            const x = margin.left + (i / totalFrames) * plotW;
            const y = margin.top + (1 - (data[i].upper - yMin) / yRange) * plotH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (let i = currentFrame; i >= 0; i--) {
            const x = margin.left + (i / totalFrames) * plotW;
            const y = margin.top + (1 - (data[i].lower - yMin) / yRange) * plotH;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Mean line
        ctx.beginPath();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        for (let i = 0; i <= currentFrame; i++) {
            const x = margin.left + (i / totalFrames) * plotW;
            const y = margin.top + (1 - (data[i].mean - yMin) / yRange) * plotH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Current value dot
        if (currentFrame < totalFrames) {
            const x = margin.left + (currentFrame / totalFrames) * plotW;
            const y = margin.top + (1 - (data[currentFrame].mean - yMin) / yRange) * plotH;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981';
            ctx.fill();

            // Value label
            ctx.fillStyle = '#fff';
            ctx.font = '11px JetBrains Mono, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`μ = ${data[currentFrame].mean.toFixed(0)}`, x + 8, y - 4);
        }

        // Advance
        currentFrame = Math.min(currentFrame + speed, totalFrames - 1);
        if (currentFrame < totalFrames - 1) {
            animId = requestAnimationFrame(drawFrame);
        }
    }

    drawFrame();

    // Return cleanup
    return {
        stop: () => { if (animId) cancelAnimationFrame(animId); },
        restart: () => { currentFrame = 0; drawFrame(); },
    };
}

function precomputeConvergence(values) {
    const data = [];
    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        sumSq += values[i] * values[i];
        const n = i + 1;
        const mean = sum / n;
        const variance = n > 1 ? (sumSq / n - mean * mean) : 0;
        const std = Math.sqrt(Math.max(0, variance));
        const ci = n > 1 ? 1.96 * std / Math.sqrt(n) : std;

        data.push({
            n,
            mean,
            std,
            upper: mean + ci,
            lower: mean - ci,
        });
    }

    return data;
}

function drawGrid(ctx, margin, plotW, plotH, yMin, yMax) {
    const gridLines = 5;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridLines; i++) {
        const y = margin.top + (i / gridLines) * plotH;
        const val = yMax - (i / gridLines) * (yMax - yMin);
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + plotW, y);
        ctx.stroke();
        ctx.fillText(val.toFixed(0), margin.left - 5, y + 4);
    }
}
