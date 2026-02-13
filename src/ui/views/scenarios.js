/**
 * Prometheus UI - Scenarios Manager View (SCOUT-004)
 * Save, load, compare, export, and import simulation scenarios.
 */
import { escapeHTML } from '../../utils/sanitize.js';
import {
    listScenarios,
    saveScenario,
    loadScenario,
    deleteScenario,
    exportScenario,
    importScenario,
    listRuns,
} from '../../data/storage.js';

export class ScenariosView {
    constructor(state, onLoadScenario) {
        this.state = state;
        this.onLoadScenario = onLoadScenario;
    }

    async render(container) {
        const scenarios = await listScenarios();

        const verticalEmojis = {
            electronics: '📱', fashion: '👗', food: '🍕', default: '📦',
        };

        container.innerHTML = `
      <div class="anim-fade-in-up">
        <div class="section-header" style="margin-bottom: var(--space-6);">
          <div>
            <h1 class="section-header__title">💾 Historial & Escenarios</h1>
            <p class="section-header__subtitle">Guarda configuraciones, compara simulaciones y exporta escenarios</p>
          </div>
        </div>

        <!-- ═══ SAVE PANEL ═══ -->
        <div class="glass-card glass-card--static" style="margin-bottom: var(--space-6);">
          <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); margin-bottom: var(--space-4); color: var(--accent-cyan);">
            ➕ Guardar Escenario Actual
          </h3>
          <div style="display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap;">
            <input id="scenario-name" class="input" type="text"
                   placeholder="Nombre del escenario (ej: EcoSense Q1 2026)"
                   style="flex: 1; min-width: 250px;" />
            <button id="btn-save-scenario" class="btn btn--primary">
              💾 Guardar
            </button>
          </div>
          <div id="save-feedback" style="margin-top: var(--space-2); font-size: var(--text-xs); color: var(--accent-emerald); display: none;"></div>
        </div>

        <!-- ═══ IMPORT PANEL ═══ -->
        <div class="glass-card glass-card--static" style="margin-bottom: var(--space-6);">
          <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); margin-bottom: var(--space-4); color: var(--accent-violet);">
            📥 Importar Escenario
          </h3>
          <div style="display: flex; gap: var(--space-3); align-items: center;">
            <input id="import-file" type="file" accept=".json" style="font-size: var(--text-sm); color: var(--text-secondary);" />
            <button id="btn-import" class="btn btn--secondary">📥 Importar JSON</button>
          </div>
          <div id="import-feedback" style="margin-top: var(--space-2); font-size: var(--text-xs); display: none;"></div>
        </div>

        <!-- ═══ SCENARIOS LIST ═══ -->
        <div class="section-header" style="margin-bottom: var(--space-4);">
          <h2 class="section-header__title" style="font-size: var(--text-lg);">📋 Escenarios Guardados</h2>
          <span class="badge badge--cyan">${scenarios.length} escenarios</span>
        </div>

        ${scenarios.length === 0 ? `
          <div class="glass-card glass-card--static" style="text-align: center; padding: var(--space-8);">
            <div style="font-size: 2rem; margin-bottom: var(--space-3);">📭</div>
            <div style="color: var(--text-secondary);">No hay escenarios guardados todavía.</div>
            <div style="color: var(--text-muted); font-size: var(--text-xs); margin-top: var(--space-2);">
              Configura una oferta y haz clic en "Guardar" para empezar.
            </div>
          </div>
        ` : `
          <div class="grid grid--1 stagger" style="gap: var(--space-4); margin-bottom: var(--space-8);" id="scenarios-list">
            ${scenarios.map((s, idx) => `
              <div class="glass-card glass-card--static anim-fade-in-up scenario-card" data-id="${s.id}" style="animation-delay: ${idx * 60}ms;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-3);">
                  <div style="flex: 1; min-width: 200px;">
                    <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2);">
                      <span style="font-size: 1.2rem;">${verticalEmojis[s.vertical] || '📦'}</span>
                      <span style="font-weight: var(--weight-semibold); color: var(--text-primary); font-size: var(--text-base);">
                        ${escapeHTML(s.name)}
                      </span>
                      <span class="badge badge--cyan" style="font-size: 10px;">${s.vertical}</span>
                    </div>
                    <div style="display: flex; gap: var(--space-4); font-size: var(--text-xs); color: var(--text-muted);">
                      <span>📅 ${new Date(s.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>🔄 ${s.runCount} simulaciones</span>
                    </div>
                  </div>
                  <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                    <button class="btn btn--secondary btn--sm btn-load" data-id="${s.id}" title="Cargar configuración">
                      📂 Cargar
                    </button>
                    <button class="btn btn--secondary btn--sm btn-runs" data-id="${s.id}" title="Ver historial de simulaciones">
                      📊 Runs (${s.runCount})
                    </button>
                    <button class="btn btn--secondary btn--sm btn-export" data-id="${s.id}" title="Exportar como JSON">
                      📤 Exportar
                    </button>
                    <button class="btn btn--secondary btn--sm btn-delete" data-id="${s.id}" title="Eliminar escenario"
                            style="color: var(--accent-rose);">
                      🗑️
                    </button>
                  </div>
                </div>
                <!-- Run history drawer (hidden by default) -->
                <div class="runs-drawer" id="runs-${s.id}" style="display: none; margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle);"></div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

        this._bindEvents(container);
    }

    _bindEvents(container) {
        // Save scenario
        container.querySelector('#btn-save-scenario')?.addEventListener('click', async () => {
            const nameInput = container.querySelector('#scenario-name');
            const name = nameInput?.value?.trim();
            if (!name) {
                nameInput?.focus();
                return;
            }
            try {
                await saveScenario(name, this.state);
                const fb = container.querySelector('#save-feedback');
                if (fb) {
                    fb.textContent = `✅ Escenario "${name}" guardado correctamente`;
                    fb.style.display = 'block';
                    fb.style.color = 'var(--accent-emerald)';
                }
                nameInput.value = '';
                // Re-render to show new scenario
                setTimeout(() => this.render(container), 800);
            } catch (err) {
                console.error('Save error:', err);
                const fb = container.querySelector('#save-feedback');
                if (fb) {
                    fb.textContent = `❌ Error: ${err.message}`;
                    fb.style.display = 'block';
                    fb.style.color = 'var(--accent-rose)';
                }
            }
        });

        // Enter key to save
        container.querySelector('#scenario-name')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') container.querySelector('#btn-save-scenario')?.click();
        });

        // Import
        container.querySelector('#btn-import')?.addEventListener('click', async () => {
            const fileInput = container.querySelector('#import-file');
            const file = fileInput?.files?.[0];
            if (!file) return;

            const fb = container.querySelector('#import-feedback');
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                const newId = await importScenario(data);
                if (fb) {
                    fb.textContent = `✅ Escenario importado (ID: ${newId})`;
                    fb.style.display = 'block';
                    fb.style.color = 'var(--accent-emerald)';
                }
                setTimeout(() => this.render(container), 800);
            } catch (err) {
                if (fb) {
                    fb.textContent = `❌ Error: ${err.message}`;
                    fb.style.display = 'block';
                    fb.style.color = 'var(--accent-rose)';
                }
            }
        });

        // Load scenario
        container.querySelectorAll('.btn-load').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                const scenario = await loadScenario(id);
                if (scenario?.config && this.onLoadScenario) {
                    this.onLoadScenario(scenario);
                }
            });
        });

        // Export scenario
        container.querySelectorAll('.btn-export').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                try {
                    const data = await exportScenario(id);
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `prometheus-scenario-${data.scenario.name.replace(/\s+/g, '-')}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                } catch (err) {
                    console.error('Export error:', err);
                }
            });
        });

        // Delete scenario
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                if (confirm('¿Eliminar este escenario y todas sus simulaciones?')) {
                    await deleteScenario(id);
                    this.render(container);
                }
            });
        });

        // Toggle run history
        container.querySelectorAll('.btn-runs').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                const drawer = container.querySelector(`#runs-${id}`);
                if (!drawer) return;

                if (drawer.style.display !== 'none') {
                    drawer.style.display = 'none';
                    return;
                }

                const runs = await listRuns(id);
                if (runs.length === 0) {
                    drawer.innerHTML = `<div style="font-size: var(--text-xs); color: var(--text-muted); text-align: center; padding: var(--space-3);">Sin simulaciones. Carga este escenario y ejecuta una simulación.</div>`;
                } else {
                    drawer.innerHTML = `
                      <div style="font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--accent-cyan); margin-bottom: var(--space-3);">
                        📊 Historial de Simulaciones (${runs.length})
                      </div>
                      <div style="display: flex; flex-direction: column; gap: var(--space-2);">
                        ${runs.map(r => {
                        const s = r.summary || {};
                        const d = new Date(r.timestamp);
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-3); background: var(--bg-card); border-radius: var(--radius-sm); font-size: var(--text-xs);">
                              <div style="display: flex; gap: var(--space-4); align-items: center;">
                                <span style="color: var(--text-muted);">${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span style="color: var(--text-secondary);">${s.iterations || '?'} iter</span>
                              </div>
                              <div style="display: flex; gap: var(--space-3);">
                                <span>Ventas P50: <b style="color: var(--accent-cyan);">${(s.salesP50 || 0).toLocaleString()}</b></span>
                                <span>ROI: <b style="color: ${(s.roiMean || 0) > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${(s.roiMean || 0).toFixed(1)}%</b></span>
                                <span>VaR: <b style="color: var(--accent-amber);">€${(s.inventoryVaR95 || 0).toLocaleString()}</b></span>
                              </div>
                            </div>`;
                    }).join('')}
                      </div>
                    `;
                }
                drawer.style.display = 'block';
            });
        });
    }
}
