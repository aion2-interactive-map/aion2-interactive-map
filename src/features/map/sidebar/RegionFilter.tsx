import { useTranslation } from "react-i18next";
import { useGameMap } from "@/context/GameMapContext";
import { useGameData } from "@/context/GameDataContext";
import { useMarkers } from "@/context/MarkersContext";
import { Checkbox } from "@/components/ui/checkbox";

export default function RegionFilter() {
  const { selectedMap } = useGameMap();
  const { visibleRegions, handleToggleRegion, showBorders, handleToggleBorders } =
    useGameData();
  const { regions } = useMarkers();

  const regionNs = `regions/${selectedMap?.name}`;
  const { t } = useTranslation(["common", regionNs]);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50 cursor-pointer">
        <Checkbox
          checked={showBorders}
          onCheckedChange={() => handleToggleBorders()}
        />
        <span className="text-sm font-medium">
          {t("common:menu.showBorders", "Show borders")}
        </span>
      </label>

      <ul className="flex flex-col gap-1">
        {regions.map((r) => {
          const checked = visibleRegions?.has(r.name) ?? false;
          return (
            <li key={r.id}>
              <label className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50 cursor-pointer">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => handleToggleRegion(r.name)}
                />
                <span className="flex-1 truncate text-sm">
                  {t(`${regionNs}:${r.name}.name`, r.name)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
