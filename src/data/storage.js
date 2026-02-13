/**
 * Prometheus - Storage Service (SCOUT-004)
 * CRUD operations for scenarios and simulation runs via Dexie/IndexedDB.
 */
import { db } from './db.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Scenarios
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Save current app state as a named scenario.
 * @param {string} name - user-given scenario name
 * @param {object} state - the full app state (offer, simulation, population, etc.)
 * @returns {Promise<number>} the new scenario id
 */
export async function saveScenario(name, state) {
    const now = new Date().toISOString();
    const record = {
        name,
        vertical: state.offer?.vertical ?? 'default',
        createdAt: now,
        updatedAt: now,
        // Snapshot the configuration (exclude simulationResults to keep size small)
        config: {
            offer: { ...state.offer },
            simulation: { ...state.simulation },
            population: { ...state.population },
            competitors: JSON.parse(JSON.stringify(state.competitors || [])),
            riskEvents: JSON.parse(JSON.stringify(state.riskEvents || [])),
            macroAssumptions: JSON.parse(JSON.stringify(state.macroAssumptions || {})),
        },
    };
    return db.scenarios.add(record);
}

/**
 * Update an existing scenario with current state.
 * @param {number} id
 * @param {object} state
 */
export async function updateScenario(id, state) {
    return db.scenarios.update(id, {
        updatedAt: new Date().toISOString(),
        config: {
            offer: { ...state.offer },
            simulation: { ...state.simulation },
            population: { ...state.population },
            competitors: JSON.parse(JSON.stringify(state.competitors || [])),
            riskEvents: JSON.parse(JSON.stringify(state.riskEvents || [])),
            macroAssumptions: JSON.parse(JSON.stringify(state.macroAssumptions || {})),
        },
    });
}

/**
 * List all saved scenarios (lightweight - no config payload).
 * @returns {Promise<Array>}
 */
export async function listScenarios() {
    const all = await db.scenarios.orderBy('updatedAt').reverse().toArray();
    // Attach run count for each scenario
    const enriched = await Promise.all(all.map(async (s) => {
        const runCount = await db.runs.where('scenarioId').equals(s.id).count();
        return {
            id: s.id,
            name: s.name,
            vertical: s.vertical,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            runCount,
        };
    }));
    return enriched;
}

/**
 * Load a full scenario by id (config + metadata).
 * @param {number} id
 * @returns {Promise<object|undefined>}
 */
export async function loadScenario(id) {
    return db.scenarios.get(id);
}

/**
 * Delete a scenario and all its associated runs.
 * @param {number} id
 */
export async function deleteScenario(id) {
    await db.runs.where('scenarioId').equals(id).delete();
    await db.scenarios.delete(id);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Simulation Runs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Save a simulation run result.
 * We store a summary (not the full rawResults array) to keep DB size manageable.
 * @param {number|null} scenarioId - linked scenario, or null for unsaved configs
 * @param {object} results - the simulationResults object from app state
 * @returns {Promise<number>} run id
 */
export async function saveRun(scenarioId, results) {
    const mc = results.monteCarlo || {};
    const risk = results.inventoryRisk || {};
    const profitRisk = results.profitabilityRisk || {};

    const summary = {
        iterations: mc.iterations ?? 0,
        salesP50: mc.sales?.p50 ?? 0,
        revenueP50: mc.revenue?.p50 ?? 0,
        roiMean: mc.roi?.mean ?? 0,
        marginMean: mc.margin?.mean ?? 0,
        netProfitMean: mc.netProfit?.mean ?? 0,
        inventoryVaR95: risk.inventoryVaR95 ?? 0,
        probNegativeProfit: profitRisk.probROIBelow0 ?? 0,
        safeStockRecommended: results.safeStock?.recommended ?? 0,
    };

    return db.runs.add({
        scenarioId,
        timestamp: results.timestamp || new Date().toISOString(),
        summary,
        // Store full results for reload - careful with large rawResults
        fullResults: results,
    });
}

/**
 * List runs for a scenario (lightweight summaries).
 * @param {number} scenarioId
 * @returns {Promise<Array>}
 */
export async function listRuns(scenarioId) {
    return db.runs
        .where('scenarioId')
        .equals(scenarioId)
        .reverse()
        .sortBy('timestamp');
}

/**
 * Get a single run with full results.
 * @param {number} id
 * @returns {Promise<object|undefined>}
 */
export async function getRun(id) {
    return db.runs.get(id);
}

/**
 * Delete a single run.
 * @param {number} id
 */
export async function deleteRun(id) {
    return db.runs.delete(id);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Import / Export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Export a scenario + its runs as a JSON object.
 * @param {number} scenarioId
 * @returns {Promise<object>}
 */
export async function exportScenario(scenarioId) {
    const scenario = await db.scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);
    const runs = await db.runs.where('scenarioId').equals(scenarioId).toArray();
    return {
        _format: 'prometheus-scenario-v1',
        exportedAt: new Date().toISOString(),
        scenario,
        runs,
    };
}

/**
 * Import a scenario from JSON (creates new scenario + runs).
 * @param {object} data - the exported JSON object
 * @returns {Promise<number>} the new scenario id
 */
export async function importScenario(data) {
    if (data._format !== 'prometheus-scenario-v1') {
        throw new Error('Invalid format: expected prometheus-scenario-v1');
    }
    const { scenario, runs } = data;
    // Strip old id, create new
    const { id: _oldId, ...scenarioData } = scenario;
    scenarioData.createdAt = new Date().toISOString();
    scenarioData.updatedAt = scenarioData.createdAt;
    scenarioData.name = scenarioData.name + ' (importado)';

    const newId = await db.scenarios.add(scenarioData);

    // Re-link runs
    if (runs && runs.length > 0) {
        const mappedRuns = runs.map(({ id: _rid, ...r }) => ({
            ...r,
            scenarioId: newId,
        }));
        await db.runs.bulkAdd(mappedRuns);
    }
    return newId;
}
