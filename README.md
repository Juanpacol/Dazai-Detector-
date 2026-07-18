# Dazai Detector

Explainable credit card fraud detection platform.

## What it is

Dazai Detector combines anomaly detection and supervised ML to score fraud risk, explain each alert, generate reports, and support grounded investigation chat.

## What recruiters should see

- Hybrid detection: DBSCAN + XGBoost
- Explainability: SHAP-based alert breakdowns
- Investigation layer: agent-routed chat with real tool-backed sources
- Reporting: automatic high-risk summaries
- Deployment-ready: Docker Compose, Hugging Face Spaces, and Cloudflare Pages

## Demo flow

1. Open the dashboard to see risk KPIs and fraud patterns
2. Browse alerts and inspect a single alert
3. Review the narrative, signal breakdown, and SHAP explanation
4. Use chat to ask why an alert was flagged or to summarize patterns
5. Open reports to see the generated fraud summary

## Run locally

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- MCP server: http://localhost:8001/mcp

## Evaluation harness

Run the offline quality harness before demoing:

```bash
python platform/backend/services/eval_service.py
```

It writes a plain-text JSON + Markdown report under `data/outputs/evaluations/`.
If you have Ollama running locally, you can enable optional qualitative grading with:

```bash
OLLAMA_EVAL_URL=http://localhost:11434 OLLAMA_EVAL_MODEL=llama3.1 python platform/backend/services/eval_service.py
```

## Tests

Run the backend tests with:

```bash
PYTHONPATH=.:platform python3.11 -m unittest discover -s platform/backend/tests -t platform
```

## Documentation

All project documentation is kept in plain text Markdown files under `docs/` and `README.md` so recruiters can scan the architecture, deployment, and evaluation flow quickly.

## Deploy

- Backend: Hugging Face Spaces using `deploy/huggingface-space/Dockerfile`
- Frontend: Cloudflare Pages using `platform/frontend`

See `docs/deployment.md` for the full deployment guide.

## Repo

https://github.com/Juanpacol/Dazai-Detector-

## Built with Codex + GPT-5.6

Codex was used to inspect, review, and update the codebase. GPT-5.6 was used to help refine the project structure, tighten the README, and keep the presentation clear and concise.
