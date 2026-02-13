/**
 * Prometheus – Unit Tests for Probability Distributions
 * QA-002: Validates all 6 distribution types + PRNG + computeStats
 */
import { describe, it, expect } from 'vitest';
import {
    PRNG,
    NormalDistribution,
    TruncatedNormalDistribution,
    BetaDistribution,
    TriangularDistribution,
    UniformDistribution,
    LogNormalDistribution,
    computeStats,
} from '../engine/distributions.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Seeded PRNG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('PRNG', () => {
    it('produces values in [0, 1)', () => {
        const rng = new PRNG(12345);
        for (let i = 0; i < 1000; i++) {
            const v = rng.next();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it('is deterministic with same seed', () => {
        const a = new PRNG(42);
        const b = new PRNG(42);
        for (let i = 0; i < 100; i++) {
            expect(a.next()).toBe(b.next());
        }
    });

    it('produces different sequences with different seeds', () => {
        const a = new PRNG(1);
        const b = new PRNG(2);
        const seqA = Array.from({ length: 10 }, () => a.next());
        const seqB = Array.from({ length: 10 }, () => b.next());
        expect(seqA).not.toEqual(seqB);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Normal Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('NormalDistribution', () => {
    const rng = new PRNG(42);
    const dist = new NormalDistribution(100, 10);

    it('samples with expected mean', () => {
        const samples = dist.sampleN(10000, new PRNG(42));
        const mean = samples.reduce((a, b) => a + b) / samples.length;
        expect(mean).toBeCloseTo(100, 0); // within ±1
    });

    it('has correct statistical properties', () => {
        expect(dist.mean()).toBe(100);
        expect(dist.variance()).toBe(100); // 10²
        expect(dist.stddev()).toBeCloseTo(10);
    });

    it('pdf peaks at the mean', () => {
        const pdfAtMean = dist.pdf(100);
        const pdfAtOffset = dist.pdf(110);
        expect(pdfAtMean).toBeGreaterThan(pdfAtOffset);
    });

    it('serializes to JSON', () => {
        const json = dist.toJSON();
        expect(json.type).toBe('normal');
        expect(json.params.mu).toBe(100);
        expect(json.params.sigma).toBe(10);
    });

    it('is deterministic with same seed', () => {
        const a = dist.sampleN(50, new PRNG(99));
        const b = dist.sampleN(50, new PRNG(99));
        expect(a).toEqual(b);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Truncated Normal Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('TruncatedNormalDistribution', () => {
    it('respects bounds', () => {
        const dist = new TruncatedNormalDistribution(50, 20, 30, 70);
        const samples = dist.sampleN(5000, new PRNG(42));
        for (const s of samples) {
            expect(s).toBeGreaterThanOrEqual(30);
            expect(s).toBeLessThanOrEqual(70);
        }
    });

    it('has mean approximately at center for symmetric bounds', () => {
        const dist = new TruncatedNormalDistribution(50, 10, 30, 70);
        const samples = dist.sampleN(10000, new PRNG(42));
        const mean = samples.reduce((a, b) => a + b) / samples.length;
        expect(mean).toBeCloseTo(50, 0);
    });

    it('pdf returns 0 outside bounds', () => {
        const dist = new TruncatedNormalDistribution(50, 10, 30, 70);
        expect(dist.pdf(29)).toBe(0);
        expect(dist.pdf(71)).toBe(0);
        expect(dist.pdf(50)).toBeGreaterThan(0);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Beta Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('BetaDistribution', () => {
    it('samples in [0, 1]', () => {
        const dist = new BetaDistribution(2, 5);
        const samples = dist.sampleN(5000, new PRNG(42));
        for (const s of samples) {
            expect(s).toBeGreaterThanOrEqual(0);
            expect(s).toBeLessThanOrEqual(1);
        }
    });

    it('has correct mean for alpha=2, beta=5', () => {
        const dist = new BetaDistribution(2, 5);
        expect(dist.mean()).toBeCloseTo(2 / 7, 4);
    });

    it('sample mean matches theoretical mean', () => {
        const dist = new BetaDistribution(2, 5);
        const samples = dist.sampleN(10000, new PRNG(42));
        const sampleMean = samples.reduce((a, b) => a + b) / samples.length;
        expect(sampleMean).toBeCloseTo(dist.mean(), 1);
    });

    it('serializes correctly', () => {
        const dist = new BetaDistribution(3, 4);
        const json = dist.toJSON();
        expect(json.type).toBe('beta');
        expect(json.params.alpha).toBe(3);
        expect(json.params.beta).toBe(4);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Triangular Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('TriangularDistribution', () => {
    it('samples in [min, max]', () => {
        const dist = new TriangularDistribution(10, 50, 30);
        const samples = dist.sampleN(5000, new PRNG(42));
        for (const s of samples) {
            expect(s).toBeGreaterThanOrEqual(10);
            expect(s).toBeLessThanOrEqual(50);
        }
    });

    it('has correct mean', () => {
        const dist = new TriangularDistribution(10, 50, 30);
        expect(dist.mean()).toBe(30); // (10 + 50 + 30) / 3
    });

    it('pdf peaks at mode', () => {
        const dist = new TriangularDistribution(0, 100, 60);
        const pdfAtMode = dist.pdf(60);
        const pdfAtEdge = dist.pdf(10);
        expect(pdfAtMode).toBeGreaterThan(pdfAtEdge);
    });

    it('pdf is 0 outside range', () => {
        const dist = new TriangularDistribution(10, 50, 30);
        expect(dist.pdf(9)).toBe(0);
        expect(dist.pdf(51)).toBe(0);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Uniform Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('UniformDistribution', () => {
    it('samples in [min, max]', () => {
        const dist = new UniformDistribution(5, 15);
        const samples = dist.sampleN(5000, new PRNG(42));
        for (const s of samples) {
            expect(s).toBeGreaterThanOrEqual(5);
            expect(s).toBeLessThanOrEqual(15);
        }
    });

    it('has correct mean', () => {
        const dist = new UniformDistribution(0, 10);
        expect(dist.mean()).toBe(5);
    });

    it('has correct variance', () => {
        const dist = new UniformDistribution(0, 12);
        expect(dist.variance()).toBe(12); // (12-0)² / 12
    });

    it('pdf is constant within range', () => {
        const dist = new UniformDistribution(0, 10);
        const pdfA = dist.pdf(3);
        const pdfB = dist.pdf(7);
        expect(pdfA).toBeCloseTo(pdfB);
        expect(pdfA).toBeCloseTo(0.1);
    });

    it('pdf is 0 outside range', () => {
        const dist = new UniformDistribution(5, 15);
        expect(dist.pdf(4)).toBe(0);
        expect(dist.pdf(16)).toBe(0);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LogNormal Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('LogNormalDistribution', () => {
    it('produces only positive values', () => {
        const dist = new LogNormalDistribution(0, 0.5);
        const samples = dist.sampleN(5000, new PRNG(42));
        for (const s of samples) {
            expect(s).toBeGreaterThan(0);
        }
    });

    it('has correct mean', () => {
        const mu = 1, sigma = 0.5;
        const dist = new LogNormalDistribution(mu, sigma);
        const expectedMean = Math.exp(mu + sigma * sigma / 2);
        expect(dist.mean()).toBeCloseTo(expectedMean, 4);
    });

    it('sample mean converges to theoretical mean', () => {
        const dist = new LogNormalDistribution(1, 0.3);
        const samples = dist.sampleN(20000, new PRNG(42));
        const sampleMean = samples.reduce((a, b) => a + b) / samples.length;
        expect(sampleMean).toBeCloseTo(dist.mean(), 0);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  computeStats
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('computeStats', () => {
    it('computes correct stats for known data', () => {
        const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        const stats = computeStats(data);

        expect(stats.mean).toBe(55);
        expect(stats.min).toBe(10);
        expect(stats.max).toBe(100);
        expect(stats.p50).toBeCloseTo(50, 0); // nearest-rank: ceil(0.5*10)-1 = index 4 = 50
    });

    it('handles single element', () => {
        const stats = computeStats([42]);
        expect(stats.mean).toBe(42);
        expect(stats.min).toBe(42);
        expect(stats.max).toBe(42);
        expect(stats.std).toBe(0);
    });

    it('computes correct percentiles', () => {
        // 100 values from 1 to 100
        const data = Array.from({ length: 100 }, (_, i) => i + 1);
        const stats = computeStats(data);
        expect(stats.p10).toBeCloseTo(10, 0);  // nearest-rank: sorted[ceil(0.1*100)-1] = sorted[9] = 10
        expect(stats.p50).toBeCloseTo(50, 0);  // sorted[ceil(0.5*100)-1] = sorted[49] = 50
        expect(stats.p90).toBeCloseTo(90, 0);  // sorted[ceil(0.9*100)-1] = sorted[89] = 90
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Cross-Distribution Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Cross-Distribution', () => {
    it('sampleN returns correct count', () => {
        const distributions = [
            new NormalDistribution(0, 1),
            new BetaDistribution(2, 5),
            new TriangularDistribution(0, 100, 50),
            new UniformDistribution(0, 10),
            new LogNormalDistribution(0, 1),
        ];

        for (const dist of distributions) {
            const samples = dist.sampleN(500, new PRNG(42));
            expect(samples).toHaveLength(500);
        }
    });

    it('percentile method is correct', () => {
        const dist = new NormalDistribution(100, 10);
        const samples = dist.sampleN(10000, new PRNG(42));
        const p50 = dist.percentile(samples, 0.5);
        expect(p50).toBeCloseTo(100, 0);
    });

    it('all distributions implement toJSON', () => {
        const distributions = [
            new NormalDistribution(0, 1),
            new TruncatedNormalDistribution(0, 1, -2, 2),
            new BetaDistribution(2, 5),
            new TriangularDistribution(0, 100, 50),
            new UniformDistribution(0, 10),
            new LogNormalDistribution(0, 1),
        ];

        for (const dist of distributions) {
            const json = dist.toJSON();
            expect(json).toHaveProperty('type');
            expect(json).toHaveProperty('params');
            expect(typeof json.type).toBe('string');
        }
    });
});
