/**
 * Prometheus Engine - EventBus (ARCH-001)
 * Decoupled pub/sub system for State -> UI communication.
 * 
 * Replaces tight coupling between engine events and UI updates.
 * Any module can emit events; any module can subscribe.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EventBus
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @typedef {Object} EventBusOptions
 * @property {boolean} [debug=false] - log events to console
 * @property {number} [maxListeners=100] - max listeners per event
 */

class EventBus {
    /** @param {EventBusOptions} [options] */
    constructor(options = {}) {
        /** @type {Map<string, Set<Function>>} */
        this._listeners = new Map();
        /** @type {Map<string, *>} */
        this._lastValues = new Map();
        this._debug = options.debug ?? false;
        this._maxListeners = options.maxListeners ?? 100;
    }

    /**
     * Subscribe to an event.
     * @param {string} event - event name (e.g. 'simulation:start', 'offer:update')
     * @param {Function} callback - handler function
     * @returns {Function} unsubscribe function
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        const listeners = this._listeners.get(event);
        if (listeners.size >= this._maxListeners) {
            console.warn(`[EventBus] Max listeners (${this._maxListeners}) reached for "${event}"`);
        }
        listeners.add(callback);

        // Return unsubscribe function
        return () => {
            listeners.delete(callback);
            if (listeners.size === 0) this._listeners.delete(event);
        };
    }

    /**
     * Subscribe once - auto-unsubscribes after first call.
     * @param {string} event
     * @param {Function} callback
     * @returns {Function} unsubscribe function
     */
    once(event, callback) {
        const unsub = this.on(event, (...args) => {
            unsub();
            callback(...args);
        });
        return unsub;
    }

    /**
     * Emit an event to all subscribers.
     * @param {string} event - event name
     * @param {*} [data] - event payload
     */
    emit(event, data) {
        if (this._debug) {
            console.log(`[EventBus] ${event}`, data);
        }
        this._lastValues.set(event, data);

        const listeners = this._listeners.get(event);
        if (!listeners) return;

        for (const callback of listeners) {
            try {
                callback(data);
            } catch (err) {
                console.error(`[EventBus] Error in listener for "${event}":`, err);
            }
        }
    }

    /**
     * Get the last emitted value for an event.
     * Useful for late-subscribers to get current state.
     * @param {string} event
     * @returns {*}
     */
    lastValue(event) {
        return this._lastValues.get(event);
    }

    /**
     * Remove all listeners for a specific event or all events.
     * @param {string} [event] - if omitted, clears all
     */
    off(event) {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
    }

    /**
     * Get count of listeners for debugging.
     * @param {string} [event]
     * @returns {number}
     */
    listenerCount(event) {
        if (event) {
            return this._listeners.get(event)?.size ?? 0;
        }
        let total = 0;
        for (const s of this._listeners.values()) total += s.size;
        return total;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Singleton + Event Catalog
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Global application EventBus instance */
export const bus = new EventBus({ debug: false });

/** Event name catalog for type-safety and discoverability */
export const Events = Object.freeze({
    // Offer
    OFFER_UPDATE: 'offer:update',
    OFFER_LOADED: 'offer:loaded',

    // Market / NGC
    MARKET_UPDATE: 'market:update',
    NGC_GENERATED: 'ngc:generated',

    // Simulation
    SIM_START: 'simulation:start',
    SIM_PROGRESS: 'simulation:progress',
    SIM_COMPLETE: 'simulation:complete',
    SIM_ERROR: 'simulation:error',

    // Navigation
    VIEW_CHANGE: 'view:change',

    // State
    STATE_RESET: 'state:reset',
    STATE_LOADED: 'state:loaded',
});

export { EventBus };
