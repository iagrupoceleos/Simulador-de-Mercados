/**
 * Prometheus – Socket.IO Client (SRV-002)
 * Real-time multiplayer communication with auto-reconnect.
 */

let socket = null;
let ioLoaded = false;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Socket.IO Loader (CDN)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function loadSocketIO() {
    if (ioLoaded || typeof window.io !== 'undefined') return;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
        script.onload = () => { ioLoaded = true; resolve(); };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Connection Management
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SERVER_URL = 'http://localhost:3001';

/**
 * Connect to the multiplayer server.
 * @param {object} [options]
 * @returns {Promise<object>} - Socket-like event emitter
 */
export async function connect(options = {}) {
    await loadSocketIO();

    if (socket?.connected) return socket;

    socket = window.io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        ...options,
    });

    socket.on('connect', () => console.log('[WS] ✅ Connected:', socket.id));
    socket.on('disconnect', (reason) => console.log('[WS] ❌ Disconnected:', reason));
    socket.on('reconnect_attempt', (n) => console.log(`[WS] 🔄 Reconnecting... (attempt ${n})`));
    socket.on('reconnect_failed', () => console.error('[WS] ⛔ Reconnection failed'));

    return socket;
}

/**
 * Disconnect from server.
 */
export function disconnect() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

/**
 * Get current socket instance.
 */
export function getSocket() {
    return socket;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Multiplayer Game API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Join a game room.
 * @param {string} roomId
 * @param {string} playerName
 * @param {string} [strategy='manual']
 */
export function joinRoom(roomId, playerName, strategy = 'manual') {
    if (!socket?.connected) throw new Error('Not connected to server');
    socket.emit('room:join', { roomId, playerName, strategy });
}

/**
 * Signal that the player is ready.
 */
export function setReady() {
    if (!socket?.connected) return;
    socket.emit('player:ready');
}

/**
 * Submit player action for the current round.
 * @param {object} action - { price, inventory, marketing }
 */
export function submitAction(action) {
    if (!socket?.connected) return;
    socket.emit('player:action', action);
}

/**
 * Leave the current room.
 */
export function leaveRoom() {
    if (!socket?.connected) return;
    socket.emit('room:leave');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Event Listeners
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Subscribe to multiplayer events.
 * @param {'room:update'|'game:start'|'round:result'|'game:end'} event
 * @param {Function} callback
 */
export function on(event, callback) {
    if (!socket) throw new Error('Not connected. Call connect() first.');
    socket.on(event, callback);
    return () => socket.off(event, callback); // unsubscribe
}

/**
 * Create a complete multiplayer session handler.
 * @param {object} handlers - { onRoomUpdate, onGameStart, onRoundResult, onGameEnd }
 */
export function createMultiplayerSession(handlers = {}) {
    const unsubs = [];

    if (handlers.onRoomUpdate) unsubs.push(on('room:update', handlers.onRoomUpdate));
    if (handlers.onGameStart) unsubs.push(on('game:start', handlers.onGameStart));
    if (handlers.onRoundResult) unsubs.push(on('round:result', handlers.onRoundResult));
    if (handlers.onGameEnd) unsubs.push(on('game:end', handlers.onGameEnd));

    return {
        destroy: () => unsubs.forEach(unsub => unsub()),
    };
}

/**
 * Check connection status.
 */
export function isConnected() {
    return socket?.connected ?? false;
}

/**
 * Generate a random room ID.
 */
export function generateRoomId() {
    return `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
