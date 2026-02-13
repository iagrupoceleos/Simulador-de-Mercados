# Prometheus – Development Backlog

> Prioritized by impact × feasibility. Items are grouped by priority tier.
> Use `/dev-loop` to execute sprints against this backlog.

---

## 🔴 P0 – Foundation (Must have for reliability)

### Quality & Testing
- [x] **QA-001**: Set up Vitest testing framework (Expert: Quality) ✅ Sprint 1
- [x] **QA-002**: Unit tests for `distributions.js` – all 6 distribution types (Expert: Quality) ✅ Sprint 1
- [x] **QA-003**: Unit tests for `risk.js` – VaR/CVaR calculations (Expert: Quality) ✅ Sprint 2
- [x] **QA-004**: Integration test for full simulation pipeline (Expert: Quality) ✅ Sprint 3
- [x] **QA-005**: Input validation for all engine constructors (Expert: Quality) ✅ Sprint 3

### Security
- [x] **SEC-001**: Create `sanitize.js` utility (escapeHTML, sanitizeNumber) (Expert: Security) ✅ Sprint 1
- [x] **SEC-002**: Audit all innerHTML in views for XSS vulnerabilities (Expert: Security) ✅ Sprint 2
- [x] **SEC-003**: Add max limits for iterations (10K) and population (50K) (Expert: Security) ✅ Sprint 1

### DevOps
- [x] **DEV-001**: Add `jsconfig.json` for IDE type checking (Expert: DevOps) ✅ Sprint 1
- [x] **DEV-002**: Add build/preview scripts to package.json (Expert: DevOps) ✅ Sprint 1

---

## 🟠 P1 – Core Engine Enhancement (High impact on simulation quality)

### Simulation Realism
- [x] **SIM-001**: Add product lifecycle stages (novelty decay curve) (Expert: Simulation) ✅ Sprint 1
- [x] **SIM-002**: Add demand seasonality patterns (weekly, monthly, holiday) (Expert: Simulation) ✅ Sprint 2
- [x] **SIM-003**: Add stock-out customer defection behavior (Expert: Simulation) ✅ Sprint 3
- [x] **SIM-004**: Implement correlated uncertainties in NGC (Expert: Simulation) ✅ Sprint 4

### E-commerce Features
- [x] **ECO-001**: Add return rate modeling per vertical (Expert: E-commerce) ✅ Sprint 2
- [x] **ECO-002**: Implement markdown/promotional pricing strategies (Expert: E-commerce) ✅ Sprint 3
- [x] **ECO-003**: Add channel-specific fees and margin calculations (Expert: E-commerce) ✅ Sprint 4
- [x] **ECO-004**: Add inventory holding cost accrual (Expert: E-commerce) ✅ Sprint 4

### AI/ML
- [x] **AI-001**: Improve RL agent state representation (more features) (Expert: AI/ML) ✅ Sprint 5
- [x] **AI-002**: Add experience replay to RL agent (Expert: AI/ML) ✅ Sprint 6
- [x] **AI-003**: Multi-objective reward function (profit + share + survival) (Expert: AI/ML) ✅ Sprint 7

---

## 🟡 P2 – Analytics & Intelligence (High value for decisions)

### Data Science
- [x] **DS-001**: Implement sensitivity analysis module (Expert: Data Science) ✅ Sprint 3
- [x] **DS-002**: Add convergence diagnostic chart (Expert: Data Science) ✅ Sprint 4
- [x] **DS-003**: Create tornado chart (parameter importance) (Expert: Data Science) ✅ Sprint 5
- [x] **DS-004**: Add scenario comparison (save A, run B, diff) (Expert: Data Science) ✅ Sprint 6
- [x] **DS-005**: Add confidence intervals to all KPI displays (Expert: Data Science) ✅ Sprint 5

### Strategy
- [x] **STR-001**: Implement scenario comparison UI (Expert: Strategy) ✅ Sprint 8
- [x] **STR-002**: Add executive summary auto-generation (Expert: Strategy) ✅ Sprint 6
- [x] **STR-003**: Create strategic positioning radar chart (Expert: Strategy) ✅ Sprint 6
- [x] **STR-004**: Add "what-if" quick scenarios (±10% price, ±20% stock) (Expert: Strategy) ✅ Sprint 4

### Marketing
- [x] **MKT-001**: Implement multi-channel marketing funnel (Expert: Marketing) ✅ Sprint 5
- [x] **MKT-002**: Add CAC/LTV tracking per channel (Expert: Marketing) ✅ Sprint 6
- [x] **MKT-003**: Model brand awareness build-up (Expert: Marketing) ✅ Sprint 7
- [x] **MKT-004**: Add marketing channel allocation UI (Expert: Marketing) ✅ Sprint 8

---

## 🟢 P3 – Performance & Scale (Speed + UX polish)

### Performance
- [x] **PERF-001**: Web Worker parallelization for Monte Carlo (Expert: Performance) ✅ Sprint 8
- [x] **PERF-002**: Object allocation reduction in purchase evaluation (Expert: Performance) ✅ Sprint 8
- [x] **PERF-003**: Memory cleanup after MC aggregation (Expert: Performance) ✅ Sprint 8
- [x] **PERF-004**: Lazy chart rendering (only visible charts) (Expert: Performance) ✅ Sprint 8

### Architecture
- [x] **ARCH-001**: Extract EventBus for state → UI communication (Expert: Architect) ✅ Sprint 2
- [x] **ARCH-002**: Create ScenarioRepository for save/load/compare (Expert: Architect) ✅ Sprint 2 (via SCOUT-004 Dexie.js)
- [x] **ARCH-003**: Add PluginRegistry for vertical packs (Expert: Architect) ✅ Sprint 9
- [x] **ARCH-004**: Create TypeScript-style JSDoc interfaces for public APIs (Expert: Architect) ✅ Sprint 9

---

## 🔵 P4 – Polish & Premium UX (Delight factor)

### UX/UI
- [x] **UX-001**: Add responsive breakpoints for tablet/mobile (Expert: UX/UI) ✅ Sprint 9
- [x] **UX-002**: Implement toast notification system (Expert: UX/UI) ✅ Sprint 3
- [x] **UX-003**: Add keyboard navigation (Expert: UX/UI) ✅ Sprint 7
- [x] **UX-004**: Create skeleton loaders for results dashboard (Expert: UX/UI) ✅ Sprint 5
- [x] **UX-005**: Add export buttons (PDF report, CSV data, PNG charts) (Expert: UX/UI) ✅ Sprint 5
- [x] **UX-006**: Add dark/light theme toggle (Expert: UX/UI) ✅ Sprint 7
- [x] **UX-007**: Implement Command Palette (Ctrl+K) (Expert: UX/UI) ✅ Sprint 7

### DevOps
- [x] **DEV-003**: Configure ESLint + Prettier (Expert: DevOps) ✅ Sprint 9
- [x] **DEV-004**: Configure Vite path aliases (Expert: DevOps) ✅ Sprint 9
- [x] **DEV-005**: Add PWA support (service worker + manifest) (Expert: DevOps) ✅ Sprint 10
- [x] **DEV-006**: Bundle size analysis with visualizer (Expert: DevOps) ✅ Sprint 10

---

## 🟣 P5 – Advanced Features (Future roadmap)

- [x] **ECO-005**: Implement reorder/replenishment logic (Expert: E-commerce) ✅ Sprint 10
- [x] **ECO-006**: Model customer lifetime value with subscription churn (Expert: E-commerce) ✅ Sprint 10
- [x] **AI-004**: Implement online linear regression for ML agent (Expert: AI/ML) ✅ Sprint 10
- [x] **AI-005**: Add Nash equilibrium detection (Expert: AI/ML) ✅ Sprint 11
- [x] **DS-006**: Distribution fitting from CSV data upload (Expert: Data Science) ✅ Sprint 11
- [x] **DS-007**: Bayesian updating for expert beliefs (Expert: Data Science) ✅ Sprint 11
- [x] **SIM-005**: Add competitor exit/entry during simulation (Expert: Simulation) ✅ Sprint 11
- [x] **STR-005**: Add risk-adjusted return metrics (Sharpe ratio) (Expert: Strategy) ✅ Sprint 11
- [x] **MKT-005**: Competitive share-of-voice analysis (Expert: Marketing) ✅ Sprint 12

### 🔬 Tech Scout Discoveries
- [x] **SCOUT-001**: Integrate Comlink + Web Workers for 5-10x Monte Carlo speedup (Expert: Tech Scout) ✅ Sprint 18
- [x] **SCOUT-002**: Add jsPDF + html2canvas for PDF report export (Expert: Tech Scout) ✅ Sprint 12
- [x] **SCOUT-003**: Add SheetJS (xlsx) for CSV/Excel data export (Expert: Tech Scout) ✅ Sprint 12
- [x] **SCOUT-004**: Integrate Dexie.js (IndexedDB) for scenario save/load/history persistence (Expert: Tech Scout) ✅ Sprint 2
- [x] **SCOUT-005**: Evaluate Apache ECharts as Chart.js alternative for advanced financial charts (Expert: Tech Scout) ✅ Sprint 12
- [x] **SCOUT-006**: Add simple-statistics library for advanced stat functions (regression, CI) (Expert: Tech Scout) ✅ Sprint 12
- [x] **SCOUT-007**: Integrate Shepherd.js for guided product tour / onboarding (Expert: Tech Scout) ✅ Sprint 12
- [x] **SCOUT-008**: Sentry error monitoring integration (Expert: Tech Scout) ✅ Sprint 18

---

## 🔶 P6 – Phase 2: Deep Integration & Testing

### Testing & Integration
- [x] **QA-006**: Unit tests for new engine modules (replenishment, customer-ltv, nash, bayesian, statistics) (Expert: Quality) ✅ Sprint 13
- [x] **QA-007**: Integration test for Sprint 14-17 modules (Expert: Quality) ✅ Sprint 17
- [x] **INT-001**: Wire competitor dynamics + replenishment + customer LTV into simulation pipeline (Expert: Architect) ✅ Sprint 13
- [x] **INT-002**: Create dashboard widgets for risk-adjusted metrics and Nash analysis (Expert: UX/UI) ✅ Sprint 13
- [x] **INT-003**: Add Bayesian belief panel to config view (Expert: Data Science) ✅ Sprint 13
- [x] **INT-004**: Scenario presets library (8 verticals) (Expert: Architect) ✅ Sprint 17
- [x] **ERR-001**: Lightweight error tracking + crash reporter module (Expert: DevOps) ✅ Sprint 13

### Advanced Simulation
- [x] **SIM-006**: Multi-period simulation (monthly/quarterly planning horizon) (Expert: Simulation) ✅ Sprint 14
- [x] **SIM-007**: Supply chain delay modeling with variable lead times (Expert: Simulation) ✅ Sprint 14
- [x] **SIM-008**: Market shock events (pandemic, regulation, viral trend) (Expert: Simulation) ✅ Sprint 14

### Forecasting
- [x] **FORE-001**: Time series forecasting (exponential smoothing) (Expert: Data Science) ✅ Sprint 14
- [x] **FORE-002**: Demand planning engine with seasonal decomposition (Expert: Data Science) ✅ Sprint 14
- [x] **DS-008**: Correlation heatmap visualization module (Expert: Data Science) ✅ Sprint 14

---

## 🟤 P7 – Phase 2: Advanced ML, UX & Production

### AI/ML
- [x] **AI-006**: Multi-Armed Bandit for price exploration vs exploitation (Expert: AI/ML) ✅ Sprint 15
- [x] **AI-007**: Genetic algorithm optimizer for marketing mix (Expert: AI/ML) ✅ Sprint 15

### UX/UI
- [x] **UX-008**: Dashboard customization (draggable KPI cards) (Expert: UX/UI) ✅ Sprint 15
- [x] **UX-009**: Simulation history timeline with replay controls (Expert: UX/UI) ✅ Sprint 15
- [x] **UX-010**: Advanced filter/sort for scenario library (Expert: UX/UI) ✅ Sprint 15
- [x] **UX-011**: i18n internationalization (Spanish/English) (Expert: UX/UI) ✅ Sprint 17
- [ ] **UX-012**: Accessibility audit (ARIA labels, contrast, screen reader) (Expert: UX/UI)
- [x] **DS-009**: Monte Carlo convergence animation (Expert: Data Science) ✅ Sprint 15

### Multi-Player & Ecosystem
- [x] **SIM-009**: Multi-player competitive sim (3+ simultaneous strategies) (Expert: Simulation) ✅ Sprint 16
- [x] **SIM-010**: Market ecosystem model (suppliers, distributors, retailers) (Expert: Simulation) ✅ Sprint 16
- [x] **ECO-007**: Dynamic pricing engine (automated repricing rules) (Expert: E-commerce) ✅ Sprint 16
- [x] **ECO-008**: Promotion calendar planner with ROI estimation (Expert: E-commerce) ✅ Sprint 16
- [x] **STR-006**: SWOT analysis generator from simulation results (Expert: Strategy) ✅ Sprint 16
- [x] **MKT-006**: Attribution modeling (first-touch, last-touch, linear) (Expert: Marketing) ✅ Sprint 16

### Performance & Production
- [ ] **PERF-005**: Virtualized scrolling for large scenario lists (Expert: Performance)
- [ ] **PERF-006**: Differential updates (only re-render changed components) (Expert: Performance)
- [x] **PROD-001**: Structured application logger (Expert: DevOps) ✅ Sprint 17
- [x] **PROD-002**: Runtime health monitor (Expert: DevOps) ✅ Sprint 17
- [x] **PROD-003**: Feature flags system (Expert: DevOps) ✅ Sprint 17
- [x] **DEV-007**: CI/CD pipeline config (GitHub Actions) (Expert: DevOps) ✅ Sprint 18
- [x] **DEV-008**: Automated deployment to GitHub Pages (Expert: DevOps) ✅ Sprint 18

---

## Sprint History

| Sprint | Date | Tasks Completed | Key Metric |
|--------|------|-----------------|------------|
| — | — | — | Project at v1.0 baseline |
| Sprint 1 | 2026-02-12 | 7 tasks (QA-001,002 + SEC-001,003 + DEV-001,002 + SIM-001) | 33 tests, lifecycle engine |
| Sprint 2 | 2026-02-12 | 8 tasks (QA-003 + SEC-002 + SIM-002 + ECO-001 + ARCH-001,002 + SCOUT-004) | 54 tests, seasonality, return rates, EventBus, Dexie.js |
| Sprint 3 | 2026-02-12 | 6 tasks (QA-004,005 + SIM-003 + ECO-002 + DS-001 + UX-002) | 61 tests, defection, pricing, sensitivity, toasts |
| Sprint 4 | 2026-02-12 | 5 tasks (SIM-004 + ECO-003,004 + DS-002 + STR-004) | 61 tests, correlations, channels, holding costs, convergence, what-if |
| Sprint 5 | 2026-02-12 | 6 tasks (DS-003,005 + AI-001 + UX-004,005 + MKT-001) | 61 tests, tornado, confidence, RL features, skeleton, export, marketing funnel |
| Sprint 6 | 2026-02-12 | 5 tasks (DS-004 + STR-002,003 + MKT-002 + AI-002) | 61 tests, scenario comparison, exec summary, radar, CAC/LTV, replay buffer |
| Sprint 7 | 2026-02-12 | 5 tasks (AI-003 + MKT-003 + UX-003,006,007) | 61 tests, multi-reward, brand awareness, keyboard, theme toggle, command palette |
| Sprint 8 | 2026-02-12 | 6 tasks (PERF-001-004 + STR-001 + MKT-004) | 61 tests, worker pool, object pool, memory mgr, lazy charts, comparison view, channel allocation |
| Sprint 9 | 2026-02-12 | 5 tasks (ARCH-003,004 + DEV-003,004 + UX-001) | 61 tests, plugin registry, JSDoc types, ESLint/Prettier, Vite aliases, responsive |
| Sprint 10 | 2026-02-12 | 5 tasks (DEV-005,006 + ECO-005,006 + AI-004) | 61 tests, PWA, bundle analyzer, replenishment, customer LTV, online regression |
| Sprint 11 | 2026-02-12 | 5 tasks (AI-005 + DS-006,007 + SIM-005 + STR-005) | 61 tests, Nash equilibrium, distribution fitting, Bayesian, competitor dynamics, risk-adjusted |
| Sprint 12 | 2026-02-12 | 7 tasks (MKT-005 + SCOUT-002,003,005,006,007) | 61 tests, SOV, PDF export, Excel export, ECharts, statistics, product tour |
| Sprint 13 | 2026-02-12 | 6 tasks (QA-006 + ERR-001 + INT-001,002,003) | 93 tests, engine-modules test suite, error-tracker, pipeline-enrichment, analytics-widgets |
| Sprint 14 | 2026-02-12 | 6 tasks (SIM-006,007,008 + FORE-001,002 + DS-008) | 93 tests, multi-period, supply-chain, market-shocks, forecasting, demand-planning, correlation-heatmap |
| Sprint 15 | 2026-02-12 | 6 tasks (AI-006,007 + UX-008,009,010 + DS-009) | 93 tests, Thompson/UCB1 bandit, genetic optimizer, draggable grid, sim-history, scenario-filter, convergence-animation |
| Sprint 16 | 2026-02-12 | 6 tasks (SIM-009,010 + ECO-007,008 + STR-006 + MKT-006) | 93 tests, multiplayer-sim, ecosystem, dynamic-pricing, promotions, SWOT, attribution |
| Sprint 17 | 2026-02-12 | 6 tasks (PROD-001,002,003 + QA-007 + UX-011 + INT-004) | 131 tests, logger, health-monitor, feature-flags, i18n, scenario-presets |
| Sprint 18 | 2026-02-12 | 8 technologies (DEV-007,008 + SCOUT-001,008 + SRV-001,002 + PWA-002 + VIS-001) | CI/CD, GitHub Pages, Sentry, Comlink, D3.js, Express API, Socket.IO, PWA v2 |
