import json
from os.path import dirname
import yaml
import os
from opencc import OpenCC

# Converter for zh-TW → zh-CN
cc = OpenCC('t2s')

classes = [
    "Gladiator", "Templar", "Ranger", "Assassin",
    "Elementalist", "Sorcerer",  "Cleric", "Chanter",
]


skills = []
skills_dict = {}

json_folder = dirname(__file__)

for class_name in classes:
    file_path = os.path.join(json_folder, f"{class_name}.json")

    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for skill in data['skill']['skillList']:
            skills.append({
                'id': skill['id'],
                'needLevel': skill['needLevel'],
                'icon': skill['icon'].split("/")[-1].replace(".png", ".webp"),
                'category': skill['category'],
                'class': class_name,
            })

            # Locale mapping (store original TW name first)
            skills_dict[skill['id']] = {"name": skill['name']}
    else:
        print(f"File {file_path} does not exist. Skipping...")

# Write main aggregated skills.yaml
with open('skills.yaml', 'w', encoding='utf-8') as f:
    yaml.dump({"skills": skills}, f, allow_unicode=True, default_flow_style=False)

print("skills.yaml generated!")

# Generate zh-TW locale file
tw_file = 'locales/zh-TW/skills.yaml'
os.makedirs(os.path.dirname(tw_file), exist_ok=True)
with open(tw_file, 'w', encoding='utf-8') as f:
    yaml.dump(skills_dict, f, allow_unicode=True, default_flow_style=False)
print("zh-TW locale generated!")

# Generate zh-CN locale file with simplified chinese names
cn_file = 'locales/zh-CN/skills.yaml'
os.makedirs(os.path.dirname(cn_file), exist_ok=True)

# Convert names to Simplified Chinese
skills_cn = {}
for sid, info in skills_dict.items():
    skills_cn[sid] = {"name": cc.convert(info["name"])}

with open(cn_file, 'w', encoding='utf-8') as f:
    yaml.dump(skills_cn, f, allow_unicode=True, default_flow_style=False)

print("zh-CN locale generated!")
