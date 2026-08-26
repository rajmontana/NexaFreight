# CI workflow — parked here on purpose

The Arena agent token lacks GitHub `workflows` permission, so it cannot push
`.github/workflows/*` files. To activate CI, run ONCE from your machine:

    mkdir -p .github/workflows
    git mv docs/ci/ci.yml.example .github/workflows/ci.yml
    git commit -m "ci: activate workflow" && git push origin arena/01a03c38-nexafreight

(Or: grant the Arena GitHub App the "Workflows" permission and tell the agent
to retry.) CI = ruff lint + pytest + secret scan on every push/PR.
