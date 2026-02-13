/**
 * Prometheus Engine – Online Linear Regression for ML Agent (AI-004)
 * Streaming/incremental linear regression for feature-to-demand mapping.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Online Linear Regression
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Incremental multivariate linear regression using recursive least squares (RLS).
 */
export class OnlineLinearRegression {
    /**
     * @param {number} numFeatures - number of input features
     * @param {number} [forgettingFactor=0.99] - RLS forgetting factor (0.95-1.0)
     */
    constructor(numFeatures, forgettingFactor = 0.99) {
        this.n = numFeatures;
        this.lambda = forgettingFactor;
        this.sampleCount = 0;

        // Initialize: weights = zeros, P = identity * large value
        this.weights = new Float64Array(numFeatures);
        this.bias = 0;

        // Covariance matrix (n x n) — stored flat
        this.P = new Float64Array(numFeatures * numFeatures);
        for (let i = 0; i < numFeatures; i++) {
            this.P[i * numFeatures + i] = 100; // Large initial covariance
        }

        // Performance tracking
        this.totalLoss = 0;
        this.recentPredictions = [];
    }

    /**
     * Update model with a single observation (RLS update).
     * @param {number[]|Float64Array} features
     * @param {number} target
     * @returns {number} prediction before update
     */
    update(features, target) {
        const prediction = this.predict(features);
        const error = target - prediction;
        this.sampleCount++;

        // Compute Kalman gain: k = P * x / (lambda + x^T * P * x)
        const k = new Float64Array(this.n);
        const Px = new Float64Array(this.n);

        // P * x
        for (let i = 0; i < this.n; i++) {
            let sum = 0;
            for (let j = 0; j < this.n; j++) {
                sum += this.P[i * this.n + j] * features[j];
            }
            Px[i] = sum;
        }

        // x^T * P * x
        let xPx = 0;
        for (let i = 0; i < this.n; i++) {
            xPx += features[i] * Px[i];
        }

        // Kalman gain
        const denom = this.lambda + xPx;
        for (let i = 0; i < this.n; i++) {
            k[i] = Px[i] / denom;
        }

        // Update weights
        for (let i = 0; i < this.n; i++) {
            this.weights[i] += k[i] * error;
        }
        this.bias += 0.01 * error; // slow bias update

        // Update P: P = (P - k * x^T * P) / lambda
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                this.P[i * this.n + j] = (this.P[i * this.n + j] - k[i] * Px[j]) / this.lambda;
            }
        }

        // Track loss
        this.totalLoss += error * error;
        this.recentPredictions.push({ prediction, target, error });
        if (this.recentPredictions.length > 100) this.recentPredictions.shift();

        return prediction;
    }

    /**
     * Predict from features.
     * @param {number[]|Float64Array} features
     * @returns {number}
     */
    predict(features) {
        let sum = this.bias;
        for (let i = 0; i < this.n; i++) {
            sum += this.weights[i] * (features[i] || 0);
        }
        return sum;
    }

    /**
     * Get model statistics.
     */
    getStats() {
        const recent = this.recentPredictions;
        const recentMSE = recent.length > 0
            ? recent.reduce((s, p) => s + p.error * p.error, 0) / recent.length
            : 0;

        return {
            sampleCount: this.sampleCount,
            weights: [...this.weights],
            bias: this.bias,
            totalMSE: this.sampleCount > 0 ? this.totalLoss / this.sampleCount : 0,
            recentMSE,
            recentR2: this._computeR2(recent),
        };
    }

    /**
     * Feature importance (absolute weight magnitude).
     * @param {string[]} [featureNames]
     * @returns {Array<{name: string, importance: number}>}
     */
    getFeatureImportance(featureNames) {
        const importance = Array.from(this.weights).map((w, i) => ({
            name: featureNames?.[i] || `feature_${i}`,
            importance: Math.abs(w),
            weight: w,
        }));
        return importance.sort((a, b) => b.importance - a.importance);
    }

    /**
     * Reset model.
     */
    reset() {
        this.weights.fill(0);
        this.bias = 0;
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                this.P[i * this.n + j] = i === j ? 100 : 0;
            }
        }
        this.sampleCount = 0;
        this.totalLoss = 0;
        this.recentPredictions = [];
    }

    _computeR2(predictions) {
        if (predictions.length < 2) return 0;
        const targets = predictions.map(p => p.target);
        const mean = targets.reduce((s, v) => s + v, 0) / targets.length;
        const ssTot = targets.reduce((s, v) => s + (v - mean) ** 2, 0);
        const ssRes = predictions.reduce((s, p) => s + p.error ** 2, 0);
        return ssTot > 0 ? 1 - ssRes / ssTot : 0;
    }
}
