/**
 * Prometheus Engine - Input Validation (QA-005)
 * Validates and sanitizes inputs for all engine constructors and functions.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Validation Utilities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors - list of validation error messages
 */

/**
 * Check a numeric value is within bounds.
 * @param {*} value
 * @param {string} name - human-readable field name
 * @param {object} opts
 * @param {number} [opts.min]
 * @param {number} [opts.max]
 * @param {boolean} [opts.integer=false]
 * @param {boolean} [opts.required=true]
 * @returns {string|null} error message or null if valid
 */
export function validateNumber(value, name, opts = {}) {
    const { min, max, integer = false, required = true } = opts;
    if (value == null || value === '') {
        return required ? `${name} es requerido` : null;
    }
    const n = Number(value);
    if (isNaN(n)) return `${name} debe ser un número válido`;
    if (!isFinite(n)) return `${name} no puede ser infinito`;
    if (integer && !Number.isInteger(n)) return `${name} debe ser un entero`;
    if (min != null && n < min) return `${name} debe ser ≥ ${min} (actual: ${n})`;
    if (max != null && n > max) return `${name} debe ser ≤ ${max} (actual: ${n})`;
    return null;
}

/**
 * Check that a string is non-empty and within length bounds.
 */
export function validateString(value, name, opts = {}) {
    const { minLength = 1, maxLength = 500, required = true } = opts;
    if (value == null || value === '') {
        return required ? `${name} es requerido` : null;
    }
    if (typeof value !== 'string') return `${name} debe ser texto`;
    if (value.length < minLength) return `${name} debe tener al menos ${minLength} caracteres`;
    if (value.length > maxLength) return `${name} debe tener máximo ${maxLength} caracteres`;
    return null;
}

/**
 * Check that a value is one of allowed values.
 */
export function validateEnum(value, name, allowed) {
    if (value == null) return `${name} es requerido`;
    if (!allowed.includes(value)) return `${name} debe ser uno de: ${allowed.join(', ')}`;
    return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Engine Config Validators
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Validate offer configuration.
 * @param {object} offer
 * @returns {ValidationResult}
 */
export function validateOfferConfig(offer) {
    const errors = [];
    if (!offer || typeof offer !== 'object') return { valid: false, errors: ['Configuración de oferta requerida'] };

    const checks = [
        validateNumber(offer.basePrice, 'Precio Base', { min: 0.01, max: 1e8 }),
        validateNumber(offer.cogs, 'COGS', { min: 0, max: 1e8 }),
        validateNumber(offer.marketingBudget, 'Presupuesto MKT', { min: 0, max: 1e10 }),
        validateNumber(offer.qualityIndex, 'Índice de Calidad', { min: 0, max: 1 }),
    ];

    // COGS should be less than price
    if (offer.cogs != null && offer.basePrice != null && offer.cogs >= offer.basePrice) {
        errors.push('COGS debe ser menor que el Precio Base');
    }

    errors.push(...checks.filter(Boolean));
    return { valid: errors.length === 0, errors };
}

/**
 * Validate simulation parameters.
 * @param {object} sim
 * @returns {ValidationResult}
 */
export function validateSimulationConfig(sim) {
    const errors = [];
    if (!sim || typeof sim !== 'object') return { valid: false, errors: ['Configuración de simulación requerida'] };

    const checks = [
        validateNumber(sim.initialInventory, 'Inventario Inicial', { min: 1, max: 10e6, integer: true }),
        validateNumber(sim.iterations, 'Iteraciones', { min: 1, max: 10000, integer: true }),
        validateNumber(sim.timeHorizonWeeks, 'Horizonte Temporal', { min: 1, max: 104, integer: true }),
        validateNumber(sim.seed, 'Seed', { min: 0, max: 2147483647, integer: true, required: false }),
    ];

    errors.push(...checks.filter(Boolean));
    return { valid: errors.length === 0, errors };
}

/**
 * Validate population configuration.
 * @param {object} pop
 * @returns {ValidationResult}
 */
export function validatePopulationConfig(pop) {
    const errors = [];
    if (!pop || typeof pop !== 'object') return { valid: false, errors: ['Configuración de población requerida'] };

    const checks = [
        validateNumber(pop.totalCustomers, 'Total Clientes', { min: 1, max: 50000, integer: true }),
    ];

    errors.push(...checks.filter(Boolean));
    return { valid: errors.length === 0, errors };
}

/**
 * Validate the complete MC config.
 * @param {object} config
 * @returns {ValidationResult}
 */
export function validateFullConfig(config) {
    const errors = [];
    if (!config) return { valid: false, errors: ['Configuración requerida'] };

    const offer = validateOfferConfig(config.offerConfig);
    const sim = validateSimulationConfig(config);
    const pop = validatePopulationConfig(config.populationConfig);

    errors.push(...offer.errors, ...sim.errors, ...pop.errors);

    if (!config.ngc) errors.push('NGC (modelo de competencia) es requerido');

    return { valid: errors.length === 0, errors };
}
