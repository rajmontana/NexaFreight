.PHONY: help dev-backend dev-frontend test pytest vitest build seed

help:
	@echo NexaFreight Control Tower - Developer Commands
	@echo.
	@echo   dev-backend   Run FastAPI backend on http://localhost:8000
	@echo   dev-frontend  Run Next.js frontend on http://localhost:3000
	@echo   test          Run both backend and frontend test suites
	@echo   pytest        Run backend pytest suite
	@echo   vitest        Run frontend typecheck and vitest suite
	@echo   build         Run Next.js production build
	@echo   seed          Seed initial database data
	@echo.

dev-backend:
	cd backend && uvicorn nexafreight.main:app --host 127.0.0.1 --port 8000 --app-dir src --reload

dev-frontend:
	cd frontend && npm run dev -- -p 3000

pytest:
	cd backend && pytest -q

vitest:
	cd frontend && npx tsc --noEmit && npx vitest run

test: pytest vitest

build:
	cd frontend && npm run build

seed:
	cd backend && python scripts/activate_and_seed_positions.py