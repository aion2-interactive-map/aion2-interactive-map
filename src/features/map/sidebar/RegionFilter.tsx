import { useTranslation } from "react-i18next";
import { useGameMap } from "@/context/GameMapContext";
import { useGameData } from "@/context/GameDataContext";
import { useMarkers } from "@/context/MarkersContext";
import { cn } from "@/lib/utils";

/**
 * Per-region visibility toggles (visibleRegions). The "Show region borders"
 * master toggle lives in the ControlCluster; this lists individual regions as
 * count-pill style toggles to match the Lanhu category blocks.
 */
export default function RegionFilter() {
  const { selectedMap } = useGameMap();
  const { visibleRegions, handleToggleRegion } = useGameData();
  const { regions } = useMarkers();

  const regionNs = `regions/${selectedMap?.name}`;
  const { t } = useTranslation(["common", regionNs]);

  if (regions.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-[#3D3D3D]">
        {t("common:menu.regions", "Regions")}
      </span>
      <div className="grid grid-cols-2 gap-1.5">
        {regions.map((r) => {
          const checked = visibleRegions?.has(r.name) ?? false;
          return (
            <button
              type="button"
              key={r.id}
              aria-pressed={checked}
              onClick={() => handleToggleRegion(r.name)}
              className={cn(
                "flex h-7 items-center rounded-md px-2.5 text-[12px] transition-colors",
                checked
                  ? "bg-[#2E97FF] font-medium text-white"
                  : "bg-[#E5F0FF] text-[rgba(0,0,0,0.6)] hover:bg-[#d6e8ff]",
              )}
            >
              <span className="truncate">
                {t(`${regionNs}:${r.name}.name`, r.name)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
