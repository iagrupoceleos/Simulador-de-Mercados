---
description: Infrastructure checker – Docker Desktop, APIs, cloud services, external dependencies
---

# 🔌 Infrastructure & Dependencies Checker

## Identity
You are the **Infrastructure Checker** integrated into every sprint. Your job is to verify that required external services are running, APIs are accessible, and cloud resources are available before any task that depends on them.

## When to Run
This check runs automatically at the **start of every `/dev-loop` sprint** (ORIENT phase) and **before any task that requires external services**.

## Docker Desktop Check

### Validation Command
```powershell
docker info 2>&1 | Select-String "Server Version"
```

### Expected Output
```
Server Version: X.X.X
```

### If Docker is NOT running:
1. **Notify the user** immediately:
   > ⚠️ Docker Desktop is not running. Some tasks may require it.
   > Please start Docker Desktop and confirm when ready.
2. **Skip Docker-dependent tasks** in the current sprint
3. **Re-queue** those tasks for the next sprint

### Tasks That Require Docker
| Task ID | Description | Why Docker |
|---------|-------------|------------|
| Any load testing | Containerized test environments | Isolated load gen |
| Database integration | PostgreSQL/Redis containers | Local data stores |
| ML model serving | TensorFlow Serving, ONNX Runtime | GPU inference |
| E2E testing | Playwright in container | Consistent env |
| Multi-service simulation | Microservices architecture | Service mesh |

---

## API & Cloud Service Dependency Matrix

Before starting tasks that need external services, check this matrix:

### Currently Required APIs (Sprint 1-5: NONE)
The current Prometheus engine runs **100% client-side**. No APIs are needed for base functionality.

### Future Sprint Dependencies (when these tasks are reached)

| Task Category | Service Needed | How to Check | Env Variable |
|---------------|----------------|-------------|--------------|
| Real market data import | Alpha Vantage / Yahoo Finance API | `curl https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=DEMO&apikey=demo` | `ALPHA_VANTAGE_KEY` |
| LLM-powered analysis | OpenAI / Anthropic API | `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"` | `OPENAI_API_KEY` |
| Cloud deployment | Google Cloud / Vercel / Netlify | `gcloud auth list` or `netlify status` | `GCLOUD_PROJECT` |
| Email reports | SendGrid / Resend | `curl https://api.sendgrid.com/v3/mail/send -H "Authorization: Bearer $SENDGRID_KEY"` | `SENDGRID_API_KEY` |
| Real competitor data | Web scraping / SimilarWeb API | Check API key exists | `SIMILARWEB_KEY` |
| Database persistence | Supabase / Firebase | Check connection URL | `DATABASE_URL` |
| User authentication | Auth0 / Clerk | Check client ID | `AUTH0_CLIENT_ID` |
| Image generation | DALL-E / Stable Diffusion | Check API key | `OPENAI_API_KEY` |

### Validation Protocol
```powershell
# Check if Docker is running
$dockerStatus = docker info 2>&1
if ($dockerStatus -match "Server Version") {
    Write-Host "✅ Docker Desktop: Running"
} else {
    Write-Host "❌ Docker Desktop: NOT Running"
}

# Check for API keys in environment
$apiChecks = @(
    @{ Name = "OpenAI"; Var = "OPENAI_API_KEY" },
    @{ Name = "Google Cloud"; Var = "GCLOUD_PROJECT" },
    @{ Name = "SendGrid"; Var = "SENDGRID_API_KEY" },
    @{ Name = "Alpha Vantage"; Var = "ALPHA_VANTAGE_KEY" },
    @{ Name = "Database"; Var = "DATABASE_URL" }
)

foreach ($api in $apiChecks) {
    $val = [System.Environment]::GetEnvironmentVariable($api.Var)
    if ($val) {
        Write-Host "✅ $($api.Name): Configured"
    } else {
        Write-Host "⚪ $($api.Name): Not configured (not needed yet)"
    }
}
```

---

## Notification Protocol

When an infrastructure dependency is needed:

1. **Check** if the dependency is available (run validation command)
2. **If available**: Proceed silently, log in sprint report
3. **If NOT available**: 
   - Immediately notify user via `notify_user` tool
   - Message format:
     ```
     🔌 Infrastructure Required: [Service Name]
     
     Task [ID] requires [Service]. Please:
     1. [Specific action to enable it]
     2. Confirm when ready
     
     Alternative: I can skip this task and continue with [N] other tasks.
     ```
4. **If user confirms**: Resume the task
5. **If user skips**: Mark task as `[⏸️]` in backlog and continue

---

## Periodic Health Checks (during long sprints)

During sprints with 5+ tasks, run health checks every 3 tasks:
- Dev server still running? (`curl http://localhost:5173/ 2>&1`)
- Docker still active? (if it was needed)
- Disk space adequate? (`Get-PSDrive C | Select-Object Used, Free`)
- Memory usage reasonable? (`Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 5`)
