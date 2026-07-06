import json
import random
from pathlib import Path

pairs = set()

for i in range(9):
    fp = Path(f"bili_{i}.json")
    if not fp.exists():
        continue
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        continue

    for reply in data.get("data", {}).get("replies", []) or []:
        m = reply.get("member") or {}
        uname = m.get("uname")
        uid = m.get("mid")
        if uname and uid:
            pairs.add((uname, uid))

pairs = list(sorted(pairs))
random.seed(246681864)
sample = random.sample(list(pairs), min(3, len(pairs)))
for name, uid in sample:
    print(f"{name} -> {uid}")
