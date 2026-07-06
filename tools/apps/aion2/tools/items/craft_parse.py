import pandas as pd
import os
import re

excel_path = '永恒之塔2制作.xlsx'
output_csv = 'craft.csv'
sheets = ["铁匠", "盔甲", "炼金", "手工艺"]

# Target base columns from craft.csv
base_columns = ["名称", "閃耀名称", "类型", "生产职业", "等级"]

all_dfs = []
max_material_index = 0

for sheet in sheets:
    # Read sheet using calamine engine to avoid openpyxl issues
    df = pd.read_excel(excel_path, sheet_name=sheet, engine='calamine')
    
    # Standardize column names
    # Some sheets use '闪耀名称' (simplified) instead of '閃耀名称' (traditional)
    df.rename(columns={'闪耀名称': '閃耀名称'}, inplace=True)

    # Standardize material columns
    # Handle cases where columns are 'Unnamed: X' or have typos like '材料6数量.1'
    new_columns = []
    mat_count = 1
    for i, col in enumerate(df.columns):
        if i < 5: # base_columns: 名称, 閃耀名称, 类型, 生产职业, 等级
            new_columns.append(col)
            continue
        
        # Check if it's a material or quantity column
        # Even if it's Unnamed, if it follows the pattern after '等级' it should be material
        # Columns after index 4 should be: 材料1, 材料1数量, 材料2, 材料2数量, ...
        expected_mat_index = (i - 5) // 2 + 1
        is_quantity = (i - 5) % 2 == 1
        
        if is_quantity:
            new_columns.append(f"材料{expected_mat_index}数量")
        else:
            new_columns.append(f"材料{expected_mat_index}")
            max_material_index = max(max_material_index, expected_mat_index)
            
    df.columns = new_columns
    
    # Drop completely empty rows (happens in '炼金' sheet)
    df.dropna(subset=['名称'], inplace=True)
            
    all_dfs.append(df)

# Construct target columns dynamically
target_columns = base_columns.copy()
for i in range(1, max_material_index + 1):
    target_columns.append(f"材料{i}")
    target_columns.append(f"材料{i}数量")

final_dfs = []
for df in all_dfs:
    # Ensure all target columns exist, filling with pd.NA if missing
    for col in target_columns:
        if col not in df.columns:
            df[col] = pd.NA
            
    # Select only the target columns
    df_subset = df[target_columns].copy()
    final_dfs.append(df_subset)

# Combine all sheets
combined_df = pd.concat(final_dfs, ignore_index=True)

# Remove .0 from numbers by converting to Int64 if possible
for col in combined_df.columns:
    if "数量" in col:
        combined_df[col] = pd.to_numeric(combined_df[col], errors='coerce').astype('Int64')

# Save to CSV
combined_df.to_csv(output_csv, index=False, encoding='utf-8-sig')

print(f"Successfully parsed {excel_path} and saved to {output_csv} (Max materials: {max_material_index})")
