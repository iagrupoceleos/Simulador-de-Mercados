/**
 * Prometheus Engine – Probability Distribution Module
 * Provides statistical distributions for uncertainty modeling.
 */

// ---- Utility: Seeded PRNG (Mulberry32) ----
export class PRNG {
    constructor(seed = Date.now()) {
        this.state = seed | 0;
    }
    next() {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

const defaultRng = { next: () => Math.random() };

// ---- Box–Muller for Normal Samples ----
function boxMuller(rng) {
    let u1, u2;
    do { u1 = rng.next(); } while (u1 === 0);
    u2 = rng.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Distribution Base Class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class Distribution {
    constructor(type, params) {
        this.type = type;
        this.params = params;
    }
    sample(rng = defaultRng) { return 0; }
    mean() { return 0; }
    variance() { return 0; }
    stddev() { return Math.sqrt(this.variance()); }
    pdf(x) { return 0; }
    /** Generate N samples */
    sampleN(n, rng = defaultRng) {
        const arr = new Float64Array(n);
        for (let i = 0; i < n; i++) arr[i] = this.sample(rng);
        return arr;
    }
    /** Estimate percentile from samples */
    percentile(samples, p) {
        const sorted = Array.from(samples).sort((a, b) => a - b);
        const idx = Math.max(0, Math.ceil(p * sorted.length) - 1);
        return sorted[idx];
    }
    toJSON() {
        return { type: this.type, params: { ...this.params } };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Normal Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class NormalDistribution extends Distribution {
    constructor(mu = 0, sigma = 1) {
        super('normal', { mu, sigma });
    }
    get mu() { return this.params.mu; }
    get sigma() { return this.params.sigma; }
    sample(rng = defaultRng) {
        return this.mu + this.sigma * boxMuller(rng);
    }
    mean() { return this.mu; }
    variance() { return this.sigma ** 2; }
    pdf(x) {
        const z = (x - this.mu) / this.sigma;
        return Math.exp(-0.5 * z * z) / (this.sigma * Math.sqrt(2 * Math.PI));
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Truncated Normal Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class TruncatedNormalDistribution extends Distribution {
    constructor(mu = 0, sigma = 1, lo = -Infinity, hi = Infinity) {
        super('truncated_normal', { mu, sigma, lo, hi });
    }
    sample(rng = defaultRng) {
        const { mu, sigma, lo, hi } = this.params;
        let x;
        do { x = mu + sigma * boxMuller(rng); } while (x < lo || x > hi);
        return x;
    }
    mean() { return this.params.mu; } // approximate
    variance() { return this.params.sigma ** 2; }
    pdf(x) {
        const { lo, hi } = this.params;
        if (x < lo || x > hi) return 0;
        const norm = new NormalDistribution(this.params.mu, this.params.sigma);
        return norm.pdf(x); // unnormalized but fine for visualization
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Beta Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class BetaDistribution extends Distribution {
    constructor(alpha = 2, beta = 5) {
        super('beta', { alpha, beta });
    }
    /** Gamma variate via Marsaglia & Tsang */
    _gamma(shape, rng) {
        if (shape < 1) {
            return this._gamma(shape + 1, rng) * Math.pow(rng.next(), 1 / shape);
        }
        const d = shape - 1 / 3;
        const c = 1 / Math.sqrt(9 * d);
        while (true) {
            let x, v;
            do {
                x = boxMuller(rng);
                v = 1 + c * x;
            } while (v <= 0);
            v = v * v * v;
            const u = rng.next();
            if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
            if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
        }
    }
    sample(rng = defaultRng) {
        const a = this._gamma(this.params.alpha, rng);
        const b = this._gamma(this.params.beta, rng);
        return a / (a + b);
    }
    mean() { return this.params.alpha / (this.params.alpha + this.params.beta); }
    variance() {
        const { alpha: a, beta: b } = this.params;
        return (a * b) / ((a + b) ** 2 * (a + b + 1));
    }
    pdf(x) {
        if (x <= 0 || x >= 1) return 0;
        const { alpha: a, beta: b } = this.params;
        const B = (gamma(a) * gamma(b)) / gamma(a + b);
        return Math.pow(x, a - 1) * Math.pow(1 - x, b - 1) / B;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Triangular Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class TriangularDistribution extends Distribution {
    constructor(lo = 0, mode = 0.5, hi = 1) {
        super('triangular', { lo, mode, hi });
    }
    sample(rng = defaultRng) {
        const { lo, mode, hi } = this.params;
        const u = rng.next();
        const fc = (mode - lo) / (hi - lo);
        if (u < fc) {
            return lo + Math.sqrt(u * (hi - lo) * (mode - lo));
        }
        return hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode));
    }
    mean() { return (this.params.lo + this.params.mode + this.params.hi) / 3; }
    variance() {
        const { lo: a, mode: c, hi: b } = this.params;
        return (a * a + b * b + c * c - a * b - a * c - b * c) / 18;
    }
    pdf(x) {
        const { lo: a, mode: c, hi: b } = this.params;
        if (x < a || x > b) return 0;
        if (x < c) return 2 * (x - a) / ((b - a) * (c - a));
        if (x === c) return 2 / (b - a);
        return 2 * (b - x) / ((b - a) * (b - c));
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Uniform Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class UniformDistribution extends Distribution {
    constructor(lo = 0, hi = 1) {
        super('uniform', { lo, hi });
    }
    sample(rng = defaultRng) {
        return this.params.lo + rng.next() * (this.params.hi - this.params.lo);
    }
    mean() { return (this.params.lo + this.params.hi) / 2; }
    variance() { return (this.params.hi - this.params.lo) ** 2 / 12; }
    pdf(x) {
        const { lo, hi } = this.params;
        if (x < lo || x > hi) return 0;
        return 1 / (hi - lo);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LogNormal Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class LogNormalDistribution extends Distribution {
    constructor(mu = 0, sigma = 1) {
        super('lognormal', { mu, sigma });
    }
    sample(rng = defaultRng) {
        return Math.exp(this.params.mu + this.params.sigma * boxMuller(rng));
    }
    mean() { return Math.exp(this.params.mu + this.params.sigma ** 2 / 2); }
    variance() {
        const { mu, sigma } = this.params;
        return (Math.exp(sigma ** 2) - 1) * Math.exp(2 * mu + sigma ** 2);
    }
    pdf(x) {
        if (x <= 0) return 0;
        const { mu, sigma } = this.params;
        const z = (Math.log(x) - mu) / sigma;
        return Math.exp(-0.5 * z * z) / (x * sigma * Math.sqrt(2 * Math.PI));
    }
}

// ---- Stirling's approximation for Gamma function ----
function gamma(z) {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    const g = 7;
    const c = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// ---- Factory from JSON ----
export function distributionFromJSON(json) {
    const map = {
        normal: (p) => new NormalDistribution(p.mu, p.sigma),
        truncated_normal: (p) => new TruncatedNormalDistribution(p.mu, p.sigma, p.lo, p.hi),
        beta: (p) => new BetaDistribution(p.alpha, p.beta),
        triangular: (p) => new TriangularDistribution(p.lo, p.mode, p.hi),
        uniform: (p) => new UniformDistribution(p.lo, p.hi),
        lognormal: (p) => new LogNormalDistribution(p.mu, p.sigma),
    };
    const creator = map[json.type];
    if (!creator) throw new Error(`Unknown distribution type: ${json.type}`);
    return creator(json.params);
}

// ---- Statistical Helpers ----
export function computeStats(samples) {
    const n = samples.length;
    if (n === 0) return { mean: 0, std: 0, min: 0, max: 0, p5: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
    const sorted = Array.from(samples).sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const pct = (p) => sorted[Math.max(0, Math.ceil(p * n) - 1)];
    return {
        mean, std: Math.sqrt(variance),
        min: sorted[0], max: sorted[n - 1],
        p5: pct(0.05), p10: pct(0.1), p25: pct(0.25),
        p50: pct(0.5), p75: pct(0.75), p90: pct(0.9),
        p95: pct(0.95), p99: pct(0.99),
    };
}
