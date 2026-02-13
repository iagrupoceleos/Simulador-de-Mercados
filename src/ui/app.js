/**
 * Prometheus UI – Main App Controller
 * Orchestrates views, state management, and simulation execution.
 */
import { Sidebar } from './sidebar.js';
import { OfferConfigView } from './views/offer-config.js';
import { MarketConfigView } from './views/market-config.js';
import { SimulationView } from './views/simulation.js';
import { ResultsView } from './views/results.js';
import { VerticalPacksView } from './views/vertical-packs.js';
import { ScenariosView } from './views/scenarios.js';
import { saveRun } from '../data/storage.js';
import { NGC, CompetitorProfile, ExpertBelief } from '../engine/ngc.js';
import { MonteCarloEngine } from '../engine/montecarlo.js';
import { RiskEngine } from '../engine/risk.js';
import { Optimizer } from '../engine/optimizer.js';
import { applyVerticalPack } from '../engine/verticals.js';
import { TriangularDistribution, UniformDistribution, NormalDistribution, TruncatedNormalDistribution, BetaDistribution } from '../engine/distributions.js';
import { ECOSENSE_SCENARIO } from '../data/ecosense-scenario.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Application State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function createDefaultState() {
    return {
        offer: {
            name: '',
            basePrice: 149,
            cogs: 50,
            marketingBudget: 200000,
            qualityIndex: 0.7,
            channels: ['online', 'marketplace'],
            allowRepeat: false,
            subscriptionPrice: 0,
            subscriptionCost: 0,
            vertical: 'electronics',
        },
        simulation: {
            initialInventory: 45000,
            iterations: 500,
            timeHorizonWeeks: 26,
            seed: 42,
        },
        population: {
            totalCustomers: 5000,
        },
        competitors: [],
        riskEvents: [],
        macroAssumptions: {},
        simulationResults: null,

        loadEcoSense() {
            const eco = ECOSENSE_SCENARIO;
            this.offer = { ...eco.offer, vertical: eco.vertical };
            this.simulation = { ...eco.simulation };
            this.population = { totalCustomers: eco.population.totalCustomers };
            this.competitors = eco.competitors.map(c => ({
                ...c,
                beliefs: c.beliefs.map(b => ({
                    ...b,
                    distribution: b.distribution.toJSON ? b.distribution.toJSON() : b.distribution,
                })),
            }));
            this.riskEvents = eco.riskEvents;
            this.macroAssumptions = {};
            // Convert distributions to JSON for macro
            for (const [key, dist] of Object.entries(eco.macroAssumptions)) {
                this.macroAssumptions[key] = dist.toJSON ? dist.toJSON() : dist;
            }
        },
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  App Class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class App {
    constructor() {
        this.state = createDefaultState();
        this.currentView = 'offer-config';
        this.mcEngine = new MonteCarloEngine();

        // Views
        this.sidebar = new Sidebar((view) => this.navigate(view));
        this.views = {
            'offer-config': new OfferConfigView(this.state),
            'market-config': new MarketConfigView(this.state),
            'simulation': new SimulationView(this.state, () => this.runSimulation()),
            'results': new ResultsView(this.state),
            'vertical-packs': new VerticalPacksView(this.state),
            'scenarios': new ScenariosView(this.state, (scenario) => this.loadScenarioFromDB(scenario)),
        };
        this.activeScenarioId = null;  // SCOUT-004: track current scenario

        // DOM refs
        this.sidebarEl = document.getElementById('sidebar');
        this.topBar = document.getElementById('top-bar');
        this.viewContainer = document.getElementById('view-container');
        this.simOverlay = document.getElementById('sim-overlay');
    }

    init() {
        this.sidebar.render(this.sidebarEl);
        this.renderTopBar();
        this.renderView();

        // Cancel simulation button
        document.getElementById('btn-cancel-sim')?.addEventListener('click', () => {
            this.mcEngine.cancel();
            this.hideSimOverlay();
        });
    }

    navigate(view) {
        this.currentView = view;
        this.renderTopBar();
        this.renderView();
    }

    renderTopBar() {
        const titles = {
            'offer-config': ['📦 Nueva Oferta', 'Configura los parámetros del producto'],
            'market-config': ['🎯 Mercado & NGC', 'Competidores y distribuciones de incertidumbre'],
            'simulation': ['⚡ Wargaming', 'Control de simulación adversaria Monte Carlo'],
            'results': ['📊 Dashboard', 'Resultados, riesgo VaR/CVaR y planes de contingencia'],
            'vertical-packs': ['🏭 Vertical Packs', 'Modelos de demanda por industria'],
            'scenarios': ['💾 Historial', 'Escenarios guardados, comparación y exportación'],
        };
        const [title, subtitle] = titles[this.currentView] || ['Prometheus', ''];

        this.topBar.innerHTML = `
      <div class="flex gap-3" style="align-items:center;">
        <span class="top-bar__title">${title}</span>
        <span class="top-bar__subtitle">${subtitle}</span>
      </div>
      <div class="top-bar__actions">
        ${this.state.simulationResults ? '<span class="badge badge--emerald anim-pulse-glow">Simulación Completada</span>' : ''}
      </div>
    `;
    }

    renderView() {
        const view = this.views[this.currentView];
        if (view) view.render(this.viewContainer);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  Run Monte Carlo Simulation
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async runSimulation() {
        // Build NGC from state
        const ngc = new NGC();

        // Company data
        ngc.setCompanyParam('basePrice', this.state.offer.basePrice);
        ngc.setCompanyParam('cogs', this.state.offer.cogs);
        ngc.setCompanyParam('marketingBudget', this.state.offer.marketingBudget);

        // Add competitors
        for (const c of this.state.competitors) {
            const profile = new CompetitorProfile({
                id: c.id,
                name: c.name,
                type: c.type,
                aggressiveness: c.aggressiveness,
                financialHealth: c.financialHealth,
                marketShare: c.marketShare,
                beliefs: (c.beliefs || []).map(b => {
                    let dist;
                    if (b.distribution && b.distribution.type) {
                        const p = b.distribution.params || b.distribution;
                        switch (b.distribution.type) {
                            case 'truncated_normal': dist = new TruncatedNormalDistribution(p.mu, p.sigma, p.lo, p.hi); break;
                            case 'normal': dist = new NormalDistribution(p.mu, p.sigma); break;
                            case 'triangular': dist = new TriangularDistribution(p.lo, p.mode, p.hi); break;
                            case 'uniform': dist = new UniformDistribution(p.lo, p.hi); break;
                            case 'beta': dist = new BetaDistribution(p.alpha, p.beta); break;
                            default: dist = new NormalDistribution(0.1, 0.05);
                        }
                    } else if (b.distribution instanceof Object && b.distribution.sample) {
                        dist = b.distribution;
                    } else {
                        dist = new NormalDistribution(0.1, 0.05);
                    }
                    return new ExpertBelief({
                        id: b.id,
                        description: b.description,
                        probability: b.probability,
                        distribution: dist,
                        category: b.category || 'general',
                    });
                }),
                constraints: c.constraints || {},
            });

            if (c.cogsDistribution) {
                if (c.cogsDistribution.sample) {
                    profile.cogsDistribution = c.cogsDistribution;
                } else if (c.cogsDistribution.type) {
                    const p = c.cogsDistribution.params || c.cogsDistribution;
                    if (c.cogsDistribution.type === 'triangular') {
                        profile.cogsDistribution = new TriangularDistribution(p.lo, p.mode, p.hi);
                    } else if (c.cogsDistribution.type === 'uniform') {
                        profile.cogsDistribution = new UniformDistribution(p.lo, p.hi);
                    }
                }
            }
            if (c.marketingBudgetDistribution) {
                if (c.marketingBudgetDistribution.sample) {
                    profile.marketingBudgetDistribution = c.marketingBudgetDistribution;
                } else if (c.marketingBudgetDistribution.type) {
                    const p = c.marketingBudgetDistribution.params || c.marketingBudgetDistribution;
                    profile.marketingBudgetDistribution = new UniformDistribution(p.lo, p.hi);
                }
            }

            ngc.addCompetitor(profile);
        }

        // Risk events
        for (const re of (this.state.riskEvents || [])) {
            ngc.addRiskEvent({
                id: re.id,
                description: re.description,
                probability: re.probability,
                impactDistribution: new NormalDistribution(re.impactValue || 0.15, 0.05),
                category: re.category,
            });
        }

        // Population config with vertical adjustments
        const popConfig = applyVerticalPack(this.state.offer.vertical, {
            totalCustomers: this.state.population?.totalCustomers ?? 5000,
        });

        // Show simulation overlay
        this.showSimOverlay();
        const startTime = Date.now();

        try {
            const mcResults = await this.mcEngine.run({
                ngc,
                offerConfig: this.state.offer,
                populationConfig: popConfig,
                initialInventory: this.state.simulation.initialInventory ?? 45000,
                iterations: this.state.simulation.iterations ?? 500,
                timeHorizonWeeks: this.state.simulation.timeHorizonWeeks ?? 26,
                seed: this.state.simulation.seed ?? 42,
            }, (progress) => {
                this.updateSimProgress(progress, startTime);
            });

            if (!mcResults) {
                this.hideSimOverlay();
                return;
            }

            // Run risk analysis
            const inventoryRisk = RiskEngine.analyzeInventoryRisk(mcResults, this.state.offer.cogs);
            const profitabilityRisk = RiskEngine.analyzeProfitabilityRisk(mcResults);

            // Run optimizer
            const safeStock = Optimizer.recommendSafeStock(mcResults, this.state.offer.cogs);
            const contingencyPlans = Optimizer.generateContingencyPlans(mcResults, this.state.offer);
            const inventoryKPIs = Optimizer.computeInventoryHealthKPIs(
                mcResults, this.state.offer.cogs, this.state.simulation.initialInventory ?? 45000
            );

            // Store results
            this.state.simulationResults = {
                monteCarlo: mcResults,
                inventoryRisk,
                profitabilityRisk,
                safeStock,
                contingencyPlans,
                inventoryKPIs,
                config: { ...this.state.simulation },
                timestamp: new Date().toISOString(),
            };

            // SCOUT-004: Auto-save run to IndexedDB
            try {
                await saveRun(this.activeScenarioId, this.state.simulationResults);
            } catch (e) {
                console.warn('[SCOUT-004] Could not auto-save run:', e);
            }

            toastSuccess(`Simulación completada: ${this.state.simulation.iterations} iteraciones en ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

            this.sidebar.setHasResults(true);
            this.sidebar.render(this.sidebarEl);

            // Navigate to results
            this.hideSimOverlay();
            this.sidebar.activeView = 'results';
            this.sidebar.render(this.sidebarEl);
            this.navigate('results');

        } catch (err) {
            console.error('Simulation error:', err);
            toastError(`Error en simulación: ${err.message}`);
            this.hideSimOverlay();
            alert('Error en la simulación: ' + err.message);
        }
    }

    showSimOverlay() {
        this.simOverlay?.classList.remove('hidden');
    }

    hideSimOverlay() {
        this.simOverlay?.classList.add('hidden');
    }

    // SCOUT-004: Load a scenario from IndexedDB and restore app state
    loadScenarioFromDB(scenario) {
        if (!scenario?.config) return;
        const cfg = scenario.config;
        this.state.offer = { ...cfg.offer };
        this.state.simulation = { ...cfg.simulation };
        this.state.population = { ...cfg.population };
        this.state.competitors = cfg.competitors || [];
        this.state.riskEvents = cfg.riskEvents || [];
        this.state.macroAssumptions = cfg.macroAssumptions || {};
        this.state.simulationResults = null;
        this.activeScenarioId = scenario.id;

        // Re-create views with updated state
        this.views['offer-config'] = new OfferConfigView(this.state);
        this.views['market-config'] = new MarketConfigView(this.state);
        this.views['simulation'] = new SimulationView(this.state, () => this.runSimulation());
        this.views['results'] = new ResultsView(this.state);
        this.sidebar.setHasResults(false);

        // Navigate to offer config
        this.sidebar.activeView = 'offer-config';
        this.sidebar.render(this.sidebarEl);
        this.navigate('offer-config');
    }

    updateSimProgress(progress, startTime) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const pct = Math.round(progress.pct);

        // Update progress ring
        const circle = document.getElementById('progress-circle');
        if (circle) {
            const circumference = 2 * Math.PI * 54; // r=54
            circle.style.strokeDashoffset = circumference - (circumference * pct / 100);
            circle.style.stroke = pct < 50 ? '#00e5ff' : pct < 90 ? '#b388ff' : '#69f0ae';
        }

        // Update text
        const pctEl = document.getElementById('progress-pct');
        if (pctEl) pctEl.textContent = `${pct}%`;

        const statusEl = document.getElementById('sim-status-text');
        if (statusEl) {
            if (pct < 20) statusEl.textContent = 'Inicializando agentes y mercado...';
            else if (pct < 50) statusEl.textContent = 'Simulando interacciones adversarias...';
            else if (pct < 80) statusEl.textContent = 'Ejecutando escenarios Monte Carlo...';
            else if (pct < 95) statusEl.textContent = 'Analizando distribuciones de riesgo...';
            else statusEl.textContent = 'Calculando VaR/CVaR y recomendaciones...';
        }

        document.getElementById('stat-iter').textContent = progress.iteration.toLocaleString();
        document.getElementById('stat-agents').textContent = (this.state.population?.totalCustomers ?? 5000).toLocaleString();
        document.getElementById('stat-time').textContent = `${elapsed}s`;
    }
}
