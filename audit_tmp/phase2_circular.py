import os
import sys
import importlib
import pkgutil

os.environ["JWT_SECRET"] = "x"
sys.path.insert(0, os.path.abspath("backend/src"))

import nexafreight

def walk_and_import(package):
    for _, module_name, is_pkg in pkgutil.walk_packages(package.__path__, package.__name__ + '.'):
        try:
            importlib.import_module(module_name)
        except Exception as e:
            print(f"Error importing {module_name}: {e}")

walk_and_import(nexafreight)
print("Finished circular import check")
