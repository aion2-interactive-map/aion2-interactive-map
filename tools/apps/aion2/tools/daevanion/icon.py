from pathlib import Path

from PIL import Image, ImageDraw

# Load image
img = Image.open("boards.png").convert("RGBA")

draw = ImageDraw.Draw(img)


# Example square positions (top-left corners)
squares = [
    ("Nezekan", 452, 815, 80),
    ("Zikel", 619, 478, 80),
    ("Vaizel", 539, 478, 80),
    ("Triniel", 788, 478, 80),
    ("Background", 219, 607, 108),
]

# Draw squares
for text, x, y, size in squares:
    draw.rectangle(
        [x, y, x + size, y + size],
        outline=(255, 0, 0),
        width=1,
    )
    draw.text(
        (x, y),
        text,
        fill=(255, 0, 0),
    )

# Save result
img.save("boards_processed.png")

OUT_DIR = Path("icons")
OUT_DIR.mkdir(parents=True, exist_ok=True)

img = Image.open("boards.png").convert("RGBA")
for name, x, y, size in squares:
    crop = img.crop((x, y, x + size, y + size))

    out_path = OUT_DIR / f"{name}.webp"
    crop.save(out_path, format="WEBP", lossless=True)

    print(f"Saved {out_path}")

