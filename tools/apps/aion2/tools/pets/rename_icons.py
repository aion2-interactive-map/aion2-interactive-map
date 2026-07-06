import json
from pathlib import Path
import shutil

pets = json.load(open('table.pets.json', encoding='utf-8'))
src_dir = Path("G:\\NCSoft\\Export\\UI\\Resource\\Texture\\Portrait\\Portrait_Vehicle")
dest_dir = src_dir.parent / "Portrait_Vehicle_Rename"
dest_dir.mkdir(parents=True, exist_ok=True)

for pet in pets:
    src_filename = pet["icon"] + ".png"
    src_file = src_dir / src_filename
    dest_filename = pet["zh-CN"] + ".png"
    dest_file = dest_dir / dest_filename
    shutil.copy(src_file, dest_file)


