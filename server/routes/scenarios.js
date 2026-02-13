/**
 * Prometheus Server – Scenario CRUD Routes (SRV-001)
 * Protected routes for scenario management.
 */
import { Router } from 'express';
import { insertScenario, updateScenario, deleteScenario, getScenario, listScenarios } from '../db.js';

const router = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GET /api/scenarios – List user scenarios
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/', (req, res) => {
    try {
        const scenarios = listScenarios.all(req.user.id);
        res.json({ scenarios, count: scenarios.length });
    } catch (err) {
        console.error('[Scenarios] List error:', err);
        res.status(500).json({ error: 'Error al listar escenarios' });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GET /api/scenarios/:id – Get single scenario
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/:id', (req, res) => {
    try {
        const scenario = getScenario.get(parseInt(req.params.id), req.user.id);
        if (!scenario) {
            return res.status(404).json({ error: 'Escenario no encontrado' });
        }

        // Parse JSON fields
        scenario.config = JSON.parse(scenario.config);
        if (scenario.results) scenario.results = JSON.parse(scenario.results);

        res.json(scenario);
    } catch (err) {
        console.error('[Scenarios] Get error:', err);
        res.status(500).json({ error: 'Error al obtener escenario' });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  POST /api/scenarios – Create scenario
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post('/', (req, res) => {
    try {
        const { name, description, config } = req.body;

        if (!name || !config) {
            return res.status(400).json({ error: 'Nombre y configuración son requeridos' });
        }

        const result = insertScenario.run(
            req.user.id,
            name,
            description || '',
            JSON.stringify(config)
        );

        res.status(201).json({
            message: 'Escenario creado',
            id: result.lastInsertRowid,
        });
    } catch (err) {
        console.error('[Scenarios] Create error:', err);
        res.status(500).json({ error: 'Error al crear escenario' });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PUT /api/scenarios/:id – Update scenario
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.put('/:id', (req, res) => {
    try {
        const { name, description, config, results } = req.body;
        const id = parseInt(req.params.id);

        if (!name || !config) {
            return res.status(400).json({ error: 'Nombre y configuración son requeridos' });
        }

        const existing = getScenario.get(id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Escenario no encontrado' });
        }

        updateScenario.run(
            name,
            description || '',
            JSON.stringify(config),
            results ? JSON.stringify(results) : null,
            id,
            req.user.id
        );

        res.json({ message: 'Escenario actualizado' });
    } catch (err) {
        console.error('[Scenarios] Update error:', err);
        res.status(500).json({ error: 'Error al actualizar escenario' });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DELETE /api/scenarios/:id – Delete scenario
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const existing = getScenario.get(id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Escenario no encontrado' });
        }

        deleteScenario.run(id, req.user.id);
        res.json({ message: 'Escenario eliminado' });
    } catch (err) {
        console.error('[Scenarios] Delete error:', err);
        res.status(500).json({ error: 'Error al eliminar escenario' });
    }
});

export default router;
