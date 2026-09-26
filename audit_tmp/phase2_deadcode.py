import os
import re
from pathlib import Path

src_dir = Path("backend/src/nexafreight")

modules = []
for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.py') and f != '__init__.py':
            p = Path(root) / f
            parts = p.relative_to(src_dir).with_suffix('').parts
            module_name = ".".join(parts)
            modules.append((p, module_name, f[:-3]))

unused = []
for p, m_name, f_name in modules:
    if f_name in ['main', 'router', 'config', 'database', 'enums']:
        continue # well-known entrypoints
    
    # Grep repo for the module name or the file name
    # Simplest way: search across all .py files
    found = False
    for root2, _, files2 in os.walk("backend"):
        for f2 in files2:
            if f2.endswith('.py'):
                p2 = Path(root2) / f2
                if p == p2:
                    continue
                try:
                    with open(p2, 'r', encoding='utf-8') as file2:
                        content = file2.read()
                        if f"from nexafreight.{m_name}" in content or f"import nexafreight.{m_name}" in content or f"nexafreight.{m_name}" in content:
                            found = True
                            break
                        # Also check if it's imported via parent
                        parent_m = ".".join(m_name.split('.')[:-1])
                        if parent_m:
                            if f"from nexafreight.{parent_m} import {f_name}" in content:
                                found = True
                                break
                except Exception:
                    pass
        if found:
            break
    if not found:
        # Check tests
        for root2, _, files2 in os.walk("backend/tests"):
            for f2 in files2:
                if f2.endswith('.py'):
                    p2 = Path(root2) / f2
                    try:
                        with open(p2, 'r', encoding='utf-8') as file2:
                            content = file2.read()
                            if f"from nexafreight.{m_name}" in content or f"import nexafreight.{m_name}" in content:
                                found = True
                                break
                            parent_m = ".".join(m_name.split('.')[:-1])
                            if parent_m:
                                if f"from nexafreight.{parent_m} import {f_name}" in content:
                                    found = True
                                    break
                    except:
                        pass
            if found:
                break
                
    if not found:
        print(f"Potentially dead code: {p} ({m_name})")
