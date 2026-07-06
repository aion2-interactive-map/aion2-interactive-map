import os
from PIL import Image
from pathlib import Path

def transform_png_to_webp(src_dir, dest_dir, quality=100):
    src_path = Path(src_dir)
    dest_path = Path(dest_dir)

    if not src_path.exists():
        print(f"Source directory {src_dir} does not exist.")
        return

    for root, dirs, files in os.walk(src_path):
        for file in files:
            if file.lower().endswith('.png'):
                # Construct absolute source file path
                src_file_path = Path(root) / file
                
                # Construct relative path from source root
                relative_path = src_file_path.relative_to(src_path)
                
                # Construct absolute destination file path
                dest_file_path = (dest_path / relative_path).with_suffix('.webp')
                
                # Create destination subdirectories if they don't exist
                dest_file_path.parent.mkdir(parents=True, exist_ok=True)

                if dest_file_path.exists():
                    continue
                
                try:
                    with Image.open(src_file_path) as img:
                        img.save(dest_file_path, 'WEBP', quality=quality)
                    print(f"Converted: {src_file_path} -> {dest_file_path}")
                except Exception as e:
                    print(f"Failed to convert {src_file_path}: {e}")

if __name__ == "__main__":
    SOURCE_DIRECTORY = r"G:\NCSoft\Export\UI"
    DESTINATION_DIRECTORY = r"G:\NCSoft\Export_webp\UI"
    QUALITY = 100
    
    transform_png_to_webp(SOURCE_DIRECTORY, DESTINATION_DIRECTORY, QUALITY)
