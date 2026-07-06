"""CLI: ``python -m palworld.maps <extract|calibrate|emit|tiles>``.

Paths default from env vars (matching the old JS cli.mjs):
  PALWORLD_RAW       raw UE export root (…/Content/Pal)
  PALWORLD_DATA_OUT  data-palworld repo
  PALWORLD_RES_OUT   resource-palworld repo
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

RAW = Path(os.environ.get("PALWORLD_RAW", "E:/SteamLibrary/steamapps/common/Palworld/Exports/Pal/Content/Pal"))
DATA_OUT = Path(os.environ.get("PALWORLD_DATA_OUT", "E:/aion2-map/data-palworld"))
RES_OUT = Path(os.environ.get("PALWORLD_RES_OUT", "E:/aion2-map/resource-palworld"))
PARSED_DIR = Path(__file__).resolve().parent.parent / "parsed"


def main() -> None:
    ap = argparse.ArgumentParser(prog="python -m palworld.maps")
    ap.add_argument("stage", choices=["extract", "calibrate", "emit", "tiles"])
    args = ap.parse_args()

    if args.stage == "extract":
        from .extract import write_parsed
        write_parsed(RAW, PARSED_DIR)
        print(f"extract: wrote {PARSED_DIR}")
    elif args.stage == "calibrate":
        from .calibrate import run_calibrate
        run_calibrate(RAW, PARSED_DIR)
    elif args.stage == "emit":
        from .emit import run_emit
        run_emit(PARSED_DIR, DATA_OUT)
    elif args.stage == "tiles":
        from .tiles import run_tiles
        run_tiles(RAW, DATA_OUT, RES_OUT)


if __name__ == "__main__":
    main()
