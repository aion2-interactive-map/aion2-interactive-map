import os
from pathlib import Path
from PIL import Image

INPUT_ROOT = "G:\\NCSoft\\AION2_TW\\Aion2\\Content\\Export\\UI\\Map\\WorldMap"        # your PNG folder
OUTPUT_ROOT = "G:\\NCSoft\\AION2_TW\\Aion2\\Content\\Export\\UI_WEBP\\Map\\WorldMap"        # where to save converted results
QUALITY = 80                       # compression level (0–100)

SUB_DIRS = [
    "Abyss_Reshanta_A",
    "Abyss_Reshanta_B",
    "World_D_A",
    "World_D_Starter",
    "World_L_A",
    "World_L_Starter",
]

for subdir in SUB_DIRS:

    for dirpath, _, filenames in os.walk(INPUT_ROOT + "\\" + subdir):
        for filename in filenames:
            if not filename.lower().endswith(".png"):
                continue

            # Full input path
            input_path = os.path.join(dirpath, filename)

            # Compute relative path from root
            rel_path = os.path.relpath(dirpath, INPUT_ROOT)

            # Make sure output directory exists
            output_dir = os.path.join(OUTPUT_ROOT, rel_path)
            os.makedirs(output_dir, exist_ok=True)

            # Output filename
            output_filename = os.path.splitext(filename)[0] + ".webp"
            output_path = os.path.join(output_dir, output_filename)

            # Convert & save
            with Image.open(input_path) as img:
                img.save(
                    output_path,
                    format="WEBP",
                    quality=QUALITY,
                    method=6,
                )

            print(f"{input_path}  →  {output_path}")

print("Done.")