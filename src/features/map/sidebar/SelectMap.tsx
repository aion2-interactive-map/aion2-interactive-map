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

/**
 * Single map dropdown inside a centered gradient bar (faithful port of the old
 * SelectMap). Options are the full map list; value is selectedMap.name.
 */
export default function SelectMap() {
  const { maps, selectedMap, setSelectedMap } = useGameMap();
  const { t } = useTranslation(["maps", "common"]);

  const handleMapChange = (name: string) => {
    setSelectedMap(maps.find((m: GameMapMeta) => m.name === name));
  };

  return (
    <div className="w-full flex justify-center mt-5">
      {/* Outer styled gradient bar */}
      <div
        className="w-[323px] h-[38px] flex items-center justify-center border border-transparent rounded-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(190,211,222,0) 0%, rgba(190,211,222,0.5) 54%, rgba(190,211,222,0) 100%)",
          borderImage:
            "linear-gradient(90deg, rgba(165,187,200,0), rgba(165,187,200,1), rgba(165,187,200,0)) 1",
        }}
      >
        <Select value={selectedMap?.name ?? ""} onValueChange={handleMapChange}>
          <SelectTrigger
            data-testid="map-select"
            size="sm"
            className="w-auto max-w-[260px] justify-center gap-2 border-transparent bg-transparent px-2 py-1 text-lg font-medium leading-[18px] text-foreground shadow-none hover:bg-transparent focus-visible:ring-0 data-[state=open]:bg-transparent"
          >
            <SelectValue
              placeholder={t("common:menu.selectMap", "Select a map")}
            />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {maps.map((m) => (
              <SelectItem key={m.name} value={m.name}>
                {t(`maps:${m.name}.name`, m.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
