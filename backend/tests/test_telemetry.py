"""Telemetry handler tests — network-free (pure handlers + replay fixture)."""

from __future__ import annotations

import json
from pathlib import Path

from backend.app.models.entities import Aircraft, PositionReport, Vessel
from backend.app.services import telemetry

REPLAY_DIR = Path("data/replay")

AIS_MSG = {
    "MetaData": {"MMSI": 419111222, "ShipName": "TEST VESSEL  "},
    "PositionReport": {"User": {"Latitude": 18.95, "Longitude": 72.95},
                       "Sog": 12.5, "Cog": 275.0, "Destination": "ROTTERDAM"},
}


def test_ais_message_creates_vessel_and_report(db_session):
    assert telemetry.handle_ais_message(db_session, AIS_MSG) is True
    v = db_session.get(Vessel, 419111222)
    assert v is not None and v.name == "TEST VESSEL" and v.lat == 18.95
    assert db_session.query(PositionReport).count() == 1
    assert db_session.query(PositionReport).first().provenance == "REAL:AIS"


def test_ais_throttles_reports(db_session):
    telemetry.handle_ais_message(db_session, AIS_MSG)
    telemetry.handle_ais_message(db_session, AIS_MSG)  # within 5 min → throttled
    assert db_session.query(PositionReport).count() == 1


def test_ais_rejects_garbage(db_session):
    bad = {"MetaData": {}, "PositionReport": {"User": {}}}
    assert telemetry.handle_ais_message(db_session, bad) is False
    assert db_session.query(Vessel).count() == 0


def test_opensky_states(db_session):
    payload = {"states": [["80164b", "AIC101", "India", None, None, 77.09, 28.55,
                           10363, False, 232, 275, 0, None, 11277, "7576", False, 0]]}
    n = telemetry.handle_opensky_states(db_session, payload)
    assert n == 1
    ac = db_session.get(Aircraft, "80164b")
    assert ac.callsign == "AIC101" and ac.lat == 28.55 and ac.alt_m == 10363


def test_replay_playback(db_session, tmp_path):
    f = tmp_path / "replay.jsonl"
    f.write_text(json.dumps(AIS_MSG) + "\n" + json.dumps(AIS_MSG) + "\n", encoding="utf-8")
    assert telemetry.replay_file(db_session, f) == 2
    assert db_session.query(Vessel).count() == 1
