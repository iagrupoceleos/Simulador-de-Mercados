/**
 * Prometheus Engine – Plugin Registry for Vertical Packs (ARCH-003)
 * Extensible system for registering, loading, and applying vertical-specific configurations.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Plugin Registry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const plugins = new Map();
const hooks = new Map();

/**
 * Register a vertical pack plugin.
 * @param {object} plugin
 * @param {string} plugin.id - unique identifier
 * @param {string} plugin.name - display name
 * @param {string} plugin.version
 * @param {string} plugin.vertical - vertical category
 * @param {object} plugin.config - default config overrides
 * @param {object} [plugin.hooks] - lifecycle hooks
 */
export function registerPlugin(plugin) {
    if (!plugin.id) throw new Error('Plugin must have an id');
    if (plugins.has(plugin.id)) {
        console.warn(`Plugin "${plugin.id}" already registered, overwriting.`);
    }

    plugins.set(plugin.id, {
        ...plugin,
        registeredAt: Date.now(),
        enabled: true,
    });

    // Register hooks
    if (plugin.hooks) {
        for (const [hookName, fn] of Object.entries(plugin.hooks)) {
            if (!hooks.has(hookName)) hooks.set(hookName, []);
            hooks.get(hookName).push({ pluginId: plugin.id, fn });
        }
    }
}

/**
 * Get a registered plugin by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getPlugin(id) {
    return plugins.get(id) || null;
}

/**
 * Get all registered plugins.
 * @returns {Array}
 */
export function getAllPlugins() {
    return [...plugins.values()];
}

/**
 * Get plugins for a specific vertical.
 * @param {string} vertical
 * @returns {Array}
 */
export function getPluginsByVertical(vertical) {
    return [...plugins.values()].filter(p => p.vertical === vertical && p.enabled);
}

/**
 * Apply a plugin's configuration to a base config.
 * @param {string} pluginId
 * @param {object} baseConfig
 * @returns {object} merged config
 */
export function applyPluginConfig(pluginId, baseConfig) {
    const plugin = plugins.get(pluginId);
    if (!plugin) return baseConfig;

    return deepMerge(baseConfig, plugin.config || {});
}

/**
 * Execute a lifecycle hook.
 * @param {string} hookName
 * @param {object} context
 * @returns {object} modified context
 */
export function executeHook(hookName, context) {
    const hookHandlers = hooks.get(hookName) || [];
    let result = context;

    for (const { pluginId, fn } of hookHandlers) {
        const plugin = plugins.get(pluginId);
        if (plugin?.enabled) {
            result = fn(result, plugin) || result;
        }
    }

    return result;
}

/**
 * Enable/disable a plugin.
 * @param {string} pluginId
 * @param {boolean} enabled
 */
export function setPluginEnabled(pluginId, enabled) {
    const plugin = plugins.get(pluginId);
    if (plugin) plugin.enabled = enabled;
}

/**
 * Unregister a plugin.
 * @param {string} pluginId
 */
export function unregisterPlugin(pluginId) {
    plugins.delete(pluginId);
    // Remove hooks
    for (const [hookName, hookList] of hooks) {
        hooks.set(hookName, hookList.filter(h => h.pluginId !== pluginId));
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Built-in Vertical Plugins
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const BUILTIN_VERTICALS = [
    {
        id: 'eco-sustentable', name: 'EcoSense Sustentable', vertical: 'sustainability',
        config: { qualityIndex: 80, returnRate: 0.05, marketingMultiplier: 1.2 }
    },
    {
        id: 'tech-gadgets', name: 'Tech Gadgets', vertical: 'technology',
        config: { qualityIndex: 70, returnRate: 0.12, marketingMultiplier: 1.0 }
    },
    {
        id: 'fashion-premium', name: 'Moda Premium', vertical: 'fashion',
        config: { qualityIndex: 85, returnRate: 0.20, marketingMultiplier: 1.5 }
    },
    {
        id: 'food-gourmet', name: 'Food Gourmet', vertical: 'food',
        config: { qualityIndex: 90, returnRate: 0.03, marketingMultiplier: 0.8 }
    },
    {
        id: 'health-wellness', name: 'Salud y Bienestar', vertical: 'health',
        config: { qualityIndex: 75, returnRate: 0.08, marketingMultiplier: 1.1 }
    },
];

/**
 * Register all built-in vertical plugins.
 */
export function registerBuiltinVerticals() {
    for (const v of BUILTIN_VERTICALS) {
        registerPlugin({ ...v, version: '1.0.0' });
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}
