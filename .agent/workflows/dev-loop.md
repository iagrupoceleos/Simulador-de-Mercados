---
description: Prometheus autonomous development loop – 12-expert sprint cycle
---

# /dev-loop – Autonomous Expert Sprint

This workflow orchestrates a full development sprint using 12+ specialized experts. Run it to autonomously analyze, prioritize, execute, and verify improvements to Prometheus.

## Architecture

```
INFRA CHECK → ORIENT → DECIDE → ACT → VERIFY → REPORT
```

Each phase engages the relevant expert skills. The loop runs continuously until the batch is complete.

---

## Phase 0: INFRASTRUCTURE CHECK (Pre-flight)

> Read `.agent/skills/infrastructure.md` for full validation protocol.

// turbo
0a. Check Docker Desktop status:
```powershell
docker info 2>&1 | Select-String "Server Version"
```

0b. Check dev server is running (start if not):
```powershell
curl -s -o $null -w "%{http_code}" http://localhost:5173/ 2>$null
```
If not running, start it:
```powershell
cd "c:\Users\cesar\OneDrive\Documentos\PROTOTIPOS IA TALOS\Simulador de Mercados opus 46 v01" && npx vite --port 5173
```

0c. Check for API keys / cloud services needed by upcoming sprint tasks:
```powershell
# Check environment variables for external services
@("OPENAI_API_KEY","GCLOUD_PROJECT","DATABASE_URL","SENDGRID_API_KEY","ALPHA_VANTAGE_KEY") | ForEach-Object { $v = [Environment]::GetEnvironmentVariable($_); "$_ = $(if($v){'✅ Set'}else{'⚪ Not set'})" }
```

0d. **If any required service is missing**: Notify user immediately via `notify_user` with specific instructions on what to enable. Do NOT proceed with tasks that depend on unavailable services — skip and re-queue them.

---

## Phase 1: ORIENT (Gather Metrics & Context)

// turbo
1. Run the project build to detect any compile errors:
```powershell
cd "c:\Users\cesar\OneDrive\Documentos\PROTOTIPOS IA TALOS\Simulador de Mercados opus 46 v01"; npx vite build --mode development 2>&1
```

// turbo
2. Run tests:
```powershell
cd "c:\Users\cesar\OneDrive\Documentos\PROTOTIPOS IA TALOS\Simulador de Mercados opus 46 v01"; npm test 2>&1
```

3. Read all SKILL.md files from `.agent/skills/` to load expert personas.

4. Read the current backlog from `.agent/BACKLOG.md` — this is the prioritized list of improvements.

5. Capture the current state:
   - Total files, total LOC
   - Build status (pass/fail)
   - Test status (pass/fail, count)
   - Last sprint results (from `.agent/SPRINT_LOG.md`)
   - Open items in backlog by priority
   - Infrastructure status from Phase 0

---

## Phase 2: DECIDE (Expert Panel Prioritization)

6. **Invoke each expert** by reading their SKILL.md. Each expert reviews the backlog and current code to recommend their top 3 items. The experts are:

   | Expert | Skill File | Domain |
   |--------|-----------|--------|
   | 🏗️ Arquitecto de Software | `architect.md` | System design, patterns, coupling |
   | ⚡ Ingeniero de Performance | `performance.md` | Speed, memory, Web Workers |
   | 🧪 Ingeniero de Calidad | `quality.md` | Tests, edge cases, validation |
   | 🛡️ Ingeniero de Seguridad | `security.md` | Input validation, XSS, CSP |
   | 🎨 Ingeniero de UX/UI | `ux-engineer.md` | Accessibility, responsive, polish |
   | 📊 Experto en Ciencia de Datos | `data-scientist.md` | Statistical models, distributions |
   | 🏪 Experto en E-commerce | `ecommerce.md` | Inventory, pricing, marketplace ops |
   | 📈 Experto en Marketing | `marketing.md` | Campaign modeling, CAC/LTV, channels |
   | 💼 Experto en Estrategia | `strategist.md` | Business model, competitive analysis |
   | 🔧 Ingeniero DevOps | `devops.md` | Build, deploy, monitoring |
   | 📐 Ingeniero de Simulación | `simulation-engineer.md` | ABM, Monte Carlo, calibration |
   | 🧠 Ingeniero de IA/ML | `ai-ml-engineer.md` | RL agents, model training, optimization |
   | 🔌 Infraestructura | `infrastructure.md` | Docker, APIs, cloud, dependencies |
   | 🔬 Tech Scout | `tech-scout.md` | APIs, tools, libraries, emerging tech |

7. **Select the sprint batch**: Pick 3-8 tasks from the backlog, mixing engineering and domain items. Apply these rules:
   - Infrastructure/foundation tasks first (bottom-up)
   - Max 2 tasks per expert domain
   - Prefer tasks that unlock other tasks
   - **SKIP tasks whose infrastructure is unavailable** (Docker, APIs, etc.)
   - Mark selected tasks as `[/]` in BACKLOG.md

---

## Phase 3: ACT (Parallel Execution)

8. For each selected task:
   a. Read the relevant SKILL.md for full expert instructions
   b. Follow the skill's implementation protocol exactly
   c. Write the code changes following the skill's quality standards
   d. If the skill defines verification steps, note them for Phase 4

9. Execution rules:
   - **Parallelizable**: Tasks in different files/modules can be done in parallel
   - **Sequential**: Tasks with dependencies must be done in order
   - **Atomic commits**: Each task should be a self-contained change
   - Update `BACKLOG.md` marking completed items with `[x]`

10. **Mid-sprint health check** (every 3 tasks):
    - Dev server still running?
    - Docker still active? (if needed)
    - No memory issues?

---

## Phase 4: VERIFY (Quality Gates)

// turbo
11. Run all tests:
```powershell
cd "c:\Users\cesar\OneDrive\Documentos\PROTOTIPOS IA TALOS\Simulador de Mercados opus 46 v01"; npm test 2>&1
```

// turbo
12. Run build:
```powershell
cd "c:\Users\cesar\OneDrive\Documentos\PROTOTIPOS IA TALOS\Simulador de Mercados opus 46 v01"; npx vite build --mode development 2>&1
```

13. Open http://localhost:5173/ in the browser and:
    - Verify all 5 navigation views render without errors
    - Load EcoSense demo and confirm data population
    - Run a simulation (reduce to 50 iterations for speed)
    - Verify results dashboard renders charts and KPIs

14. Check the browser console for JavaScript errors.

15. If any verification fails:
    - Fix the issue immediately
    - Re-run verification
    - Document the fix in the sprint log

---

## Phase 5: REPORT (Sprint Summary)

16. Update `.agent/SPRINT_LOG.md` with:
```markdown
## Sprint [N] – [Date]
### Infrastructure Status
- Docker: ✅/❌/⚪ (not needed)
- APIs: [list any used]
### Completed Tasks
- [x] Task description (Expert: Name)
### Metrics Delta
- LOC: before → after
- Tests: before → after
- Build: ✅/❌
### Next Sprint Preview
- Top 3 items from remaining backlog
- Any infrastructure needed for next sprint
```

17. Update `BACKLOG.md` — mark completed items, reprioritize remaining items.

18. Notify the user with:
    - Summary of completed tasks
    - Any infrastructure needed for next sprint
    - Ask if they want to continue with another sprint

---

## Quick Reference

To run a sprint: `/dev-loop`
To add items to backlog: Edit `.agent/BACKLOG.md`
To add a new expert: Create a new SKILL.md in `.agent/skills/`
To check infrastructure: Read `.agent/skills/infrastructure.md`
