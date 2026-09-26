import os
import sys

os.environ["JWT_SECRET"] = "x"
sys.path.insert(0, os.path.abspath("backend/src"))

from nexafreight.main import app
from fastapi.routing import APIRoute
import inspect

routes = []
for route in app.routes:
    if isinstance(route, APIRoute):
        methods = ",".join(route.methods - {"OPTIONS"})
        has_auth = False
        for d in route.dependencies:
            if hasattr(d.dependency, "__name__") and d.dependency.__name__ == "get_current_user":
                has_auth = True
                
        sig = inspect.signature(route.endpoint)
        for param in sig.parameters.values():
            if hasattr(param.default, "dependency") and hasattr(param.default.dependency, "__name__"):
                if param.default.dependency.__name__ == "get_current_user":
                    has_auth = True
                    
        routes.append((methods, route.path, has_auth))

for r in sorted(routes):
    print(f"{r[0]} {r[1]} auth={r[2]}")
