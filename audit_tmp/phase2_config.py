import os
import re

fields = [
    "environment", "log_level", "debug", "database_url_override", "database_path",
    "test_database_path", "jwt_secret", "jwt_algorithm", "jwt_expiry_minutes",
    "bcrypt_rounds", "allowed_origins", "enable_ais_listener", "enable_position_interpolator",
    "use_live_ais", "enable_disruption_detector", "enable_sla_checker",
    "ais_replay_data_path", "aisstream_api_key", "ors_api_key", "gemini_api_key",
    "gemini_model", "ollama_base_url", "ollama_model", "database_url", "test_database_url",
    "is_production", "is_test"
]

usage_counts = {f: 0 for f in fields}

for root, _, files in os.walk("backend/src/nexafreight"):
    for file in files:
        if file.endswith(".py") and file != "config.py":
            with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                content = f.read()
                for field in fields:
                    if re.search(r'\bsettings\.' + field + r'\b', content) or re.search(r'\bSettings\.' + field + r'\b', content) or re.search(r'\bget_settings\(\)\.' + field + r'\b', content):
                        usage_counts[field] += 1
                        
for field, count in usage_counts.items():
    if count == 0:
        print(f"Unused config field: {field}")

os_getenv = []
for root, _, files in os.walk("backend/src/nexafreight"):
    for file in files:
        if file.endswith(".py") and file != "config.py":
            with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                lines = f.readlines()
                for i, line in enumerate(lines):
                    if "os.environ" in line or "os.getenv" in line:
                        os_getenv.append(f"os.getenv usage outside Settings: {os.path.join(root, file)} line {i+1}")

for issue in os_getenv:
    print(issue)
