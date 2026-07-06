import json
import yaml
from aion2.tools.parse.common import TABLE_DIR, PARSED_DATA_DIR, GAME_DATA_DIR

def get_map_data_path(map_name):
    """
    Get the path to MapData.json for a given map name.
    The path is constructed as game_data/<BaseDir>/<Name>/MapData.json
    """
    yaml_path = PARSED_DATA_DIR / "Map.yaml"
    if not yaml_path.exists():
        print(f"Error: {yaml_path} does not exist. Run parse_map_json first.")
        return None

    with open(yaml_path, 'r', encoding='utf-8') as f:
        maps_data = yaml.safe_load(f)

    for map_entry in maps_data:
        if map_entry.get('Name') == map_name:
            base_dir = map_entry.get('BaseDir')
            name = map_entry.get('Name')
            # Construct path: game_data/Map/<BaseDir>/<Name>/MapData.json
            # Note: BaseDir might be empty, pathlib handles it
            map_data_path = GAME_DATA_DIR / "Map" / base_dir / name / "MapData.json"
            return map_data_path

    print(f"Error: Map with name '{map_name}' not found in {yaml_path}")
    return None

def parse_map_json(input_path, output_path):
    if not input_path.exists():
        print(f"Error: {input_path} does not exist.")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    maps_data = data.get('Properties', {}).get('Data', [])
    parsed_maps = []

    for item in maps_data:
        # ID, Name, BaseDir, BaseMapId
        map_id = item.get('ID', {}).get('Value')
        name = item.get('Name')
        base_dir = item.get('BaseDir')
        base_map_id = item.get('BaseMapId', {}).get('Value')

        parsed_maps.append({
            'ID': map_id,
            'Name': name,
            'BaseDir': base_dir,
            'BaseMapId': base_map_id
        })

    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(parsed_maps, f, allow_unicode=True, sort_keys=False)

    print(f"Successfully parsed {len(parsed_maps)} maps to {output_path}")

if __name__ == "__main__":
    input_file = TABLE_DIR / "Map.json"
    output_file = PARSED_DATA_DIR / "Map.yaml"
    parse_map_json(input_file, output_file)
