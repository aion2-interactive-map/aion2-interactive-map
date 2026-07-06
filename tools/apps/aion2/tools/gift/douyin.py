import json
import random
from pathlib import Path

pairs = set()

for i in range(11):  # 0~10
    fp = Path(f"dy_{i}.json")
    if not fp.exists():
        continue
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        continue

    for c in data.get("comments", []) or []:
        user = c.get("user") or {}
        nickname = user.get("nickname")
        uid = user.get("uid")
        if nickname and uid:
            pairs.add((nickname, uid))

pairs = list(sorted(pairs))
random.seed(197791140)
sample = random.sample(list(pairs), min(3, len(pairs)))
for name, uid in sample:
    print(f"{name} -> {uid}")
