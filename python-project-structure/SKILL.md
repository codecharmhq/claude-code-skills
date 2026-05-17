---
name: python-project-structure
description: Use when setting up a new Python project, refactoring a monolithic module into packages, or when choosing between src-layout and flat-layout
---

# Python Project Structure

## Overview
Python's flexibility is a trap: without explicit structure, imports break, tests can't find your code, and packaging becomes guesswork. The `src` layout + `pyproject.toml` pattern solves all three before they start.

## When to Use
- Starting a new Python project that will be packaged or published
- Imports work locally but fail in CI or after `pip install`
- A single `utils.py` has grown to 800+ lines
- Choosing between `setup.py`, `setup.cfg`, and `pyproject.toml`

**Don't use when:** it's a single-file script under 200 lines. Don't over-structure a prototype.

## Core Workflow

### Step 1: Choose src-layout
```
project/
  src/package_name/
    __init__.py
    core.py
    cli.py
  tests/
    test_core.py
  pyproject.toml
```
`src` layout prevents accidental imports of the dev version — you must `pip install -e .` first, which catches packaging errors immediately. Flat layout (package at root) is simpler but allows import-at-a-distance bugs.

### Step 2: Define pyproject.toml
Use `setuptools` for packages with C extensions, `hatchling` (default build backend) for pure Python, `poetry` for complex dependency graphs. Pin dependencies with `>=` lower bounds, no upper bounds in libraries. Applications: pin exact versions in `requirements.txt` or use a lockfile. Always set `[project.optional-dependencies]` for dev, test, docs groups.

### Step 3: Organize by Feature, Not Layer
Top-level packages by domain: `src/myapp/users/`, `src/myapp/orders/`. Inside each: `__init__.py` re-exports the public API. Internal modules prefixed with `_` for explicit privacy. Cross-cutting concerns (logging, config) get their own top-level package. Never `from module import *`; always import modules, not objects.

**GOOD:**
```python
# src/myapp/users/core.py
from myapp.database import get_session  # explicit import, follows the package path
from myapp.users.models import User

def list_users() -> list[User]:
    session = get_session()
    return session.query(User).all()
```

**BAD:**
```python
# sys.path hack to make imports work — breaks in CI and after pip install
import sys
sys.path.insert(0, "..")                     # relative path hack — fragile, non-reproducible
from models import User                      # ambiguous import — where does "models" come from?
from src.myapp.myapp.core import something   # package name duplicated — layout is broken
```

## Quick Reference

| Scenario | Tool |
|----------|------|
| Pure Python package | `hatchling` + `pyproject.toml` |
| Lockfile for app deployment | `pip-tools` (pip-compile) or `poetry.lock` |
| Single CLI entry point | `[project.scripts]` in pyproject.toml |
| Multiple related CLIs | `click` or `typer` subcommands in `cli/` |
| Type checking CI gate | `mypy --strict` on src directory |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `sys.path.insert(0, '..')` in tests | `pip install -e .[dev]` then import normally |
| `__init__.py` full of logic | Re-export only; logic goes in private modules |
| Circular imports between modules | Extract shared interface to `_types.py` or use late import |
| `*` in `__init__.py` | Explicit `__all__` list; one export per line |

### Anti-Patterns — Reject on Sight
- `sys.path.insert(0, '..')` in any test or source file — this is a packaging failure, not a workaround; it works on the developer's machine and nowhere else; use `pip install -e .[dev]` instead
- Import path that duplicates the package name: `from myapp.myapp.core import something` — the package name appears twice in the import path, indicating a broken `src` layout or a nested package mistake
- `requirements.txt` with zero version pins — every `pip install` produces a different environment; pin at least the major version: `requests>=2.28,<3`

## Red Flags
- `sys.path` manipulation anywhere in source or tests — broken packaging
- Import path duplicates the package name: `from myapp.myapp.core import ...` — fix your layout
- `requirements.txt` without versions — every CI run draws different dependencies

**If you need sys.path hacks to make imports work, your project structure is broken. Fix the structure, not the path.**
