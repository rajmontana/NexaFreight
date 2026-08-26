# CI + Deploy — one-time activation (owner, ~5 minutes)

The Arena agent token cannot push workflow files or write repo secrets (403),
so these two steps are yours. After them, everything is automatic:
CI on every push, deploy to Hugging Face Spaces on every push to `main`.

## Step 1 — Add the 4 secrets

GitHub → `rajmontana/NexaFreight` → **Settings → Secrets and variables → Actions →
New repository secret** (add each):

| Name | Value |
|---|---|
| `AISSTREAM_API_KEY` | *(your AISStream key — the agent has it in chat)* |
| `GROQ_API_KEY` | *(your Groq key)* |
| `HF_TOKEN` | *(your HF write token)* |
| `SEED_USER_PASSWORD` | a strong password for the operator logins |

## Step 2 — Activate the workflows (one push from your machine)

```bat
git pull
mkdir .github\workflows
git mv docs\ci\ci.yml.example .github\workflows\ci.yml
git mv docs\ci\deploy.yml.example .github\workflows\deploy.yml
git commit -m "ci: activate CI + deploy workflows"
git push
```

## Step 3 — Create the HF Space (one time, in browser)

huggingface.co → New **Space** → name `nexafreight`, SDK **Docker**, CPU Basic
(free 2 vCPU/16GB). Then in the repo **Settings → Secrets and variables →
Actions → Variables** add variable `HF_SPACE` = your HF username (used by
deploy.yml). Set the same 4 secrets above in the **Space settings → Variables
and secrets** too (the app reads them at runtime).

Deployment flow thereafter: push to `main` → Actions runs lint+tests → pushes
the repo into the Space → Space builds the Docker image → app live at
`https://<username>-nexafreight.hf.space` with TLS, any device.

A free 5-minute ping from https://cron-job.org keeps the Space from sleeping.
