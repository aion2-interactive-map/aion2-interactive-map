from pathlib import Path

# C:\Users\liuyh\PycharmProjects\aion2-tools\aion2\tools\parse\common.py
# This file is located in aion2\tools\parse\

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent

GAME_DATA_DIR = PROJECT_ROOT / "game_data"
TABLE_DIR = GAME_DATA_DIR / "Table"
PARSED_DATA_DIR = PROJECT_ROOT / "parsed_data"

# Ensure output directory exists
PARSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
