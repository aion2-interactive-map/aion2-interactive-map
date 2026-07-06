"""Compatibility import path for legacy tests using ``tools.*``."""
from __future__ import annotations

from importlib import import_module

_aion2_tools = import_module("aion2.tools")
__path__ = _aion2_tools.__path__
