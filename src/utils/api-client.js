/**
 * Prometheus – API Client (SRV-001)
 * Fetch wrapper with JWT auth, retry logic, and offline-first sync.
 */

const API_BASE = 'http://localhost:3001/api';
let authToken = null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Auth Token Management
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function setToken(token) {
    authToken = token;
    try { localStorage.setItem('prometheus_token', token); } catch (_) { /* noop */ }
}

export function getToken() {
    if (!authToken) {
        try { authToken = localStorage.getItem('prometheus_token'); } catch (_) { /* noop */ }
    }
    return authToken;
}

export function clearToken() {
    authToken = null;
    try { localStorage.removeItem('prometheus_token'); } catch (_) { /* noop */ }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Fetch Wrapper with Retry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Make an authenticated API request.
 * @param {string} path - API path (e.g., '/scenarios')
 * @param {object} [options]
 * @param {number} [retries=2]
 */
async function apiFetch(path, options = {}, retries = 2) {
    const url = `${API_BASE}${path}`;
    const token = getToken();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, config);

            if (response.status === 401) {
                clearToken();
                throw new Error('SESSION_EXPIRED');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            if (err.message === 'SESSION_EXPIRED') throw err;
            if (attempt === retries) throw err;

            // Exponential backoff
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Auth API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function register(username, password) {
    const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    if (data.token) setToken(data.token);
    return data;
}

export async function login(username, password) {
    const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    if (data.token) setToken(data.token);
    return data;
}

export function logout() {
    clearToken();
}

export function isAuthenticated() {
    return !!getToken();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Scenarios API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function listScenariosFromCloud() {
    return apiFetch('/scenarios');
}

export async function getScenarioFromCloud(id) {
    return apiFetch(`/scenarios/${id}`);
}

export async function saveScenarioToCloud(name, config, description = '') {
    return apiFetch('/scenarios', {
        method: 'POST',
        body: JSON.stringify({ name, config, description }),
    });
}

export async function updateScenarioInCloud(id, data) {
    return apiFetch(`/scenarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteScenarioFromCloud(id) {
    return apiFetch(`/scenarios/${id}`, { method: 'DELETE' });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Sync (Local Dexie → Cloud)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Sync local scenarios to cloud.
 * Requires Dexie db instance with 'simulations' table.
 * @param {import('dexie').Dexie} dexieDb
 */
export async function syncLocalToCloud(dexieDb) {
    if (!isAuthenticated() || !navigator.onLine) return { synced: 0 };

    try {
        const localScenarios = await dexieDb.table('simulations').toArray();
        const { scenarios: cloudScenarios } = await listScenariosFromCloud();

        const cloudNames = new Set(cloudScenarios.map(s => s.name));
        let synced = 0;

        for (const local of localScenarios) {
            if (!cloudNames.has(local.name || local.scenarioName)) {
                await saveScenarioToCloud(
                    local.name || local.scenarioName || 'Sin nombre',
                    local.config || local,
                    local.description || ''
                );
                synced++;
            }
        }

        return { synced, total: localScenarios.length };
    } catch (err) {
        console.error('[API] Sync error:', err);
        return { synced: 0, error: err.message };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Health Check
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function checkServerHealth() {
    try {
        const data = await apiFetch('/health', {}, 0);
        return { online: true, ...data };
    } catch (_) {
        return { online: false };
    }
}
