from pathlib import Path

from PIL import Image, ImageDraw

# Load image
img = Image.open("icons.png").convert("RGBA")

draw = ImageDraw.Draw(img)

# Define square size
size = 64

# Example square positions (top-left corners)
squares = [
    ("Guarder", 11, 200),
    ("Torso", 9, 284),
    ("Shoulder", 9, 368),

    ("Rune", 106, 10),
    ("Helmet", 106, 94),
    ("Bracelet", 106, 178),
    ("Boots", 106, 262),
    ("Belt", 106, 346),
    ("Amulet", 106, 430),

    ("Ring", 188, 10),
    ("Gloves", 188, 94),

    ("Pants", 274, 10),
    ("Earring", 274, 94),

    ("Necklace", 357, 10),
    ("Cape", 357, 94),
]

# Draw squares
for text, x, y in squares:
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
img.save("icons_processed.png")

OUT_DIR = Path("icons")
OUT_DIR.mkdir(parents=True, exist_ok=True)

img = Image.open("icons.png").convert("RGBA")
for name, x, y in squares:
    crop = img.crop((x, y, x + size, y + size))

    out_path = OUT_DIR / f"{name}.webp"
    crop.save(out_path, format="WEBP", lossless=True)

    print(f"Saved {out_path}")


img = Image.open("weapon.png").convert("RGBA")
x, y = 415, 427
name = "Weapon"
draw = ImageDraw.Draw(img)
draw.rectangle(
        [x, y, x + size, y + size],
        outline=(255, 0, 0),
        width=1,
    )
img.save("weapon_processed.png")
img = Image.open("weapon.png").convert("RGBA")
crop = img.crop((x, y, x + size, y + size))
out_path = OUT_DIR / f"{name}.webp"
crop.save(out_path, format="WEBP", lossless=True)
print(f"Saved {out_path}")