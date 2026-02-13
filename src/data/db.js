/**
 * Prometheus - Dexie Database Definition (SCOUT-004)
 * Client-side IndexedDB persistence for scenarios and simulation runs.
 */
import Dexie from 'dexie';

/** @ts-ignore - scenarios and runs are created dynamically by Dexie.version().stores() */
const db = new Dexie('PrometheusDB');

// ━━━ Schema v1 ━━━
db.version(1).stores({
    // Saved configurations (offer, sim params, competitors, etc.)
    scenarios: '++id, name, vertical, createdAt, updatedAt',
    // Simulation results linked to a scenario
    runs: '++id, scenarioId, timestamp',
});

export { db };

