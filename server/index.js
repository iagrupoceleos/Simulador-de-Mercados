/**
 * Prometheus Server – Express + Socket.IO Entry Point (SRV-001 + SRV-002)
 * 
 * Start: npm run dev (in server/)
 * Port: 3001 (API) + Socket.IO on same port
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import authRouter, { authenticateToken } from './routes/auth.js';
import scenariosRouter from './routes/scenarios.js';

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Middleware
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '5mb' }));

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde' },
});
app.use('/api/', limiter);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.use('/api/auth', authRouter);
app.use('/api/scenarios', authenticateToken, scenariosRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '2.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Socket.IO – Real-time Multiplayer (SRV-002)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const io = new SocketServer(httpServer, {
    cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

// In-memory game rooms
const rooms = new Map();

io.on('connection', (socket) => {
    console.log(`[Socket] Player connected: ${socket.id}`);

    // ── Join a game room ──
    socket.on('room:join', ({ roomId, playerName, strategy }) => {
        socket.join(roomId);

        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [],
                state: 'waiting',
                round: 0,
                maxRounds: 10,
                actions: [],
            });
        }

        const room = rooms.get(roomId);
        const player = {
            id: socket.id,
            name: playerName || `Player_${socket.id.slice(0, 4)}`,
            strategy: strategy || 'manual',
            score: 0,
            ready: false,
        };

        room.players.push(player);
        socket.data.roomId = roomId;
        socket.data.playerName = player.name;

        io.to(roomId).emit('room:update', {
            players: room.players,
            state: room.state,
            round: room.round,
        });

        console.log(`[Socket] ${player.name} joined room ${roomId} (${room.players.length} players)`);
    });

    // ── Player ready ──
    socket.on('player:ready', () => {
        const roomId = socket.data.roomId;
        if (!roomId || !rooms.has(roomId)) return;

        const room = rooms.get(roomId);
        const player = room.players.find(p => p.id === socket.id);
        if (player) player.ready = true;

        // Start game if all players ready (min 2)
        const allReady = room.players.length >= 2 && room.players.every(p => p.ready);
        if (allReady && room.state === 'waiting') {
            room.state = 'playing';
            room.round = 1;
            io.to(roomId).emit('game:start', {
                round: 1,
                maxRounds: room.maxRounds,
                players: room.players.map(p => ({ name: p.name, strategy: p.strategy })),
            });
        }

        io.to(roomId).emit('room:update', {
            players: room.players,
            state: room.state,
        });
    });

    // ── Player action (price/strategy decision) ──
    socket.on('player:action', ({ price, inventory, marketing }) => {
        const roomId = socket.data.roomId;
        if (!roomId || !rooms.has(roomId)) return;

        const room = rooms.get(roomId);
        if (room.state !== 'playing') return;

        room.actions.push({
            playerId: socket.id,
            playerName: socket.data.playerName,
            round: room.round,
            price: price ?? 100,
            inventory: inventory ?? 50,
            marketing: marketing ?? 10,
        });

        // Process round when all players have submitted
        if (room.actions.filter(a => a.round === room.round).length === room.players.length) {
            const roundActions = room.actions.filter(a => a.round === room.round);
            const results = simulateRound(roundActions, room.round);

            // Update scores
            for (const result of results) {
                const player = room.players.find(p => p.id === result.playerId);
                if (player) player.score += result.profit;
            }

            io.to(roomId).emit('round:result', {
                round: room.round,
                results,
                standings: room.players
                    .map(p => ({ name: p.name, score: p.score }))
                    .sort((a, b) => b.score - a.score),
            });

            // Next round or end game
            room.round++;
            if (room.round > room.maxRounds) {
                room.state = 'finished';
                io.to(roomId).emit('game:end', {
                    standings: room.players
                        .map(p => ({ name: p.name, score: p.score }))
                        .sort((a, b) => b.score - a.score),
                });
                rooms.delete(roomId);
            }
        }
    });

    // ── Leave room ──
    socket.on('room:leave', () => handleDisconnect(socket));

    // ── Disconnect ──
    socket.on('disconnect', () => {
        handleDisconnect(socket);
        console.log(`[Socket] Player disconnected: ${socket.id}`);
    });
});

function handleDisconnect(socket) {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    room.players = room.players.filter(p => p.id !== socket.id);

    if (room.players.length === 0) {
        rooms.delete(roomId);
    } else {
        io.to(roomId).emit('room:update', {
            players: room.players,
            state: room.state,
        });
    }

    socket.leave(roomId);
}

/**
 * Simple round simulation – competitive market dynamics.
 */
function simulateRound(actions, round) {
    const avgPrice = actions.reduce((s, a) => s + a.price, 0) / actions.length;
    const totalMarketing = actions.reduce((s, a) => s + a.marketing, 0);

    return actions.map(action => {
        const priceAdvantage = (avgPrice - action.price) / avgPrice;
        const marketingShare = totalMarketing > 0 ? action.marketing / totalMarketing : 1 / actions.length;

        // Demand influenced by price competitiveness + marketing share
        const baseDemand = 100 + round * 5; // Growing market
        const demand = Math.round(baseDemand * (0.5 + priceAdvantage * 0.3 + marketingShare * 0.5));
        const sales = Math.min(demand, action.inventory);
        const revenue = sales * action.price;
        const costs = action.inventory * (action.price * 0.4) + action.marketing * 100;
        const profit = Math.round(revenue - costs);

        return {
            playerId: action.playerId,
            playerName: action.playerName,
            demand,
            sales,
            revenue: Math.round(revenue),
            costs: Math.round(costs),
            profit,
        };
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Start Server
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   🔥 Prometheus Server v2.0.0               ║
║   API:    http://localhost:${PORT}/api          ║
║   Socket: ws://localhost:${PORT}                ║
║   Health: http://localhost:${PORT}/api/health   ║
╚══════════════════════════════════════════════╝
    `);
});

export { app, io };
