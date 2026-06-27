import { useTranslation } from "react-i18next";
import { useGameMap } from "@/context/GameMapContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SelectMap() {
  const { maps, selectedMap, setSelectedMap } = useGameMap();
  const { t } = useTranslation(["maps"]);

  return (
    <Select
      value={selectedMap?.name ?? ""}
      onValueChange={(v) => setSelectedMap(maps.find((m) => m.name === v))}
    >
      <SelectTrigger data-testid="map-select" className="w-full">
        <SelectValue placeholder={t("maps:placeholder", "Select a map")} />
      </SelectTrigger>
      <SelectContent>
        {maps.map((m) => (
          <SelectItem key={m.name} value={m.name}>
            {t(`maps:${m.name}.name`, m.name)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
