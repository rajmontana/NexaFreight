"""Portal integrity guard — the sandbox snapshot corruption twice shipped
broken/reverted portal files. This test makes CI the gatekeeper: a corrupted
portal can never deploy again (AGENTS.md §8 state-reality + §5 phase report).
"""

from __future__ import annotations

from pathlib import Path

import pytest

PORTAL = Path(__file__).resolve().parents[2] / "portal"


def test_app_js_parses_and_is_the_ops_console():
    esprima = pytest.importorskip("esprima")  # pinned in requirements-dev
    src = (PORTAL / "js" / "app.js").read_text(encoding="utf-8")
    esprima.parseScript(src)  # raises on any syntax error
    # content markers: the real SPA, not the legacy glassmorphism file
    for marker in ("renderApp", "viewAlerts", "viewShipments", "viewDashboard",
                   "Split-Pane Triage", "/api/alerts/generate"):
        assert marker in src, f"app.js missing marker: {marker}"


def test_index_references_bundled_assets():
    html = (PORTAL / "index.html").read_text(encoding="utf-8")
    assert "NexaFreight Control Tower" in html
    assert "/static/css/style.css" in html and "/static/js/app.js" in html
    assert 'src="js/app.js"' not in html  # legacy relative-path variant


def test_css_is_ops_dark_with_alert_styles():
    css = (PORTAL / "css" / "style.css").read_text(encoding="utf-8")
    assert "--bg: #0A1420" in css
    for marker in (".replay-banner", ".split", ".alert-row", ".btn-ok", ".opt-row"):
        assert marker in css, f"style.css missing marker: {marker}"
