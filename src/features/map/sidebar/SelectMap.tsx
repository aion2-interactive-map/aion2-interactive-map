import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGameMap } from "@/context/GameMapContext";
import type { GameMapMeta } from "@/types/game";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Map a GameMapMeta.type to a race bucket key (matches common:race.*). */
function raceOf(type: string): "light" | "dark" | "abyss" {
  if (type === "dark") return "dark";
  if (type === "abyss") return "abyss";
  return "light";
}

const RACE_ORDER: Array<"light" | "dark" | "abyss"> = ["light", "dark", "abyss"];

/**
 * Race + Map dual selector.
 * - The RACE select filters which maps appear in the MAP select.
 * - The MAP select calls setSelectedMap. Keeps data-testid="map-select".
 */
export default function SelectMap() {
  const { maps, selectedMap, setSelectedMap } = useGameMap();
  const { t } = useTranslation(["maps", "common"]);

  // Races that actually have at least one visible map.
  const availableRaces = useMemo(() => {
    const set = new Set(maps.map((m) => raceOf(m.type)));
    return RACE_ORDER.filter((r) => set.has(r));
  }, [maps]);

  const currentRace = selectedMap ? raceOf(selectedMap.type) : availableRaces[0];

  const mapsForRace = useMemo(
    () => maps.filter((m) => raceOf(m.type) === currentRace),
    [maps, currentRace],
  );

  const handleRaceChange = (race: string) => {
    const r = race as "light" | "dark" | "abyss";
    // If the currently-selected map is not in the new race, switch to the
    // first map of that race.
    if (!selectedMap || raceOf(selectedMap.type) !== r) {
      const first = maps.find((m) => raceOf(m.type) === r);
      if (first) setSelectedMap(first);
    }
  };

  const handleMapChange = (name: string) => {
    setSelectedMap(maps.find((m: GameMapMeta) => m.name === name));
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentRace ?? ""} onValueChange={handleRaceChange}>
        <SelectTrigger
          data-testid="race-select"
          className="h-8 w-[88px] shrink-0 border-transparent bg-transparent px-2 text-[13px] font-medium text-[#3D3D3D] shadow-none focus-visible:ring-0"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableRaces.map((r) => (
            <SelectItem key={r} value={r}>
              {t(`common:race.${r}`, r)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedMap?.name ?? ""} onValueChange={handleMapChange}>
        <SelectTrigger
          data-testid="map-select"
          className="h-8 flex-1 border-transparent bg-transparent px-2 text-[13px] font-medium text-[#3D3D3D] shadow-none focus-visible:ring-0"
        >
          <SelectValue
            placeholder={t("common:menu.selectMap", "Select a map")}
          />
        </SelectTrigger>
        <SelectContent>
          {mapsForRace.map((m) => (
            <SelectItem key={m.name} value={m.name}>
              {t(`maps:${m.name}.name`, m.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
