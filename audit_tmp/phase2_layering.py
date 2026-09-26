import os
import re
from pathlib import Path

src_dir = Path("backend/src/nexafreight")

def get_layer(path: Path) -> str:
    parts = path.relative_to(src_dir).parts
    if parts:
        return parts[0]
    return ""

findings = []

for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.py'):
            p = Path(root) / f
            layer = get_layer(p)
            
            with open(p, 'r', encoding='utf-8') as file:
                try:
                    lines = file.readlines()
                    for i, line in enumerate(lines):
                        m = re.search(r'^(?:from|import)\s+nexafreight\.(\w+)', line)
                        if m:
                            target_layer = m.group(1)
                            
                            if layer == "api" and p.parent.name == "routes":
                                if target_layer == "api":
                                    m2 = re.search(r'nexafreight\.api\.routes\.(\w+)', line)
                                    if m2 and m2.group(1) != p.stem:
                                        findings.append(f"Layering issue: Route {p.as_posix()} imports route {target_layer} on line {i+1}")
                                        
                            if layer == "services" and target_layer in ["api", "routers"]:
                                findings.append(f"Layering issue: Service {p.as_posix()} imports {target_layer} on line {i+1}")
                                
                            if layer == "adapters" and target_layer in ["services", "api", "routers"]:
                                findings.append(f"Layering issue: Adapter {p.as_posix()} imports {target_layer} on line {i+1}")
                                
                            if layer == "models" and target_layer in ["services", "api", "routers", "adapters"]:
                                findings.append(f"Layering issue: Model {p.as_posix()} imports {target_layer} on line {i+1}")
                except Exception:
                    pass

for finding in findings:
    print(finding)
print("Finished layering check")
