import csv
from pathlib import Path

def check_duplicates(file_name):
    csv_path = Path(__file__).parent / file_name
    if not csv_path.exists():
        print(f"File {file_name} not found.")
        return

    all_numbers = []
    duplicates = []
    seen = set()

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for line_num, row in enumerate(reader, 1):
            if not row or len(row) < 2:
                continue
            
            for item in row:
                try:
                    num = int(item.strip())
                    if num in seen:
                        duplicates.append((num, line_num))
                    else:
                        seen.add(num)
                        all_numbers.append(num)
                except ValueError:
                    continue

    if duplicates:
        print(f"Duplicates found in {file_name}:")
        for num, line in duplicates:
            print(f"Number {num} at line {line} is a duplicate.")
    else:
        print(f"No duplicates found in {file_name}. All {len(all_numbers)} numbers are unique.")

if __name__ == "__main__":
    check_duplicates("matchings_2_3.csv")
