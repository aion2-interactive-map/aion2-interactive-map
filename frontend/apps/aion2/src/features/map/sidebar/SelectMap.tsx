import { useTranslation } from "react-i18next";
import { useGameMap } from "@/context/GameMapContext";
import { ShellMapSelect } from "@gamemap/map-shell";

export default function SelectMap() {
  const { maps, selectedMap, setSelectedMap } = useGameMap();
  const { t } = useTranslation(["maps", "common"]);

  return (
    <ShellMapSelect
      classNames={{ wrapper: "mt-5" }}
      maps={maps.map((m) => ({ id: m.name, label: t(`maps:${m.name}.name`, m.name) }))}
      activeMapId={selectedMap?.name ?? ""}
      onSelectMap={(id) => setSelectedMap(maps.find((m) => m.name === id))}
      placeholder={t("common:menu.selectMap", "Select a map")}
    />
  );
}
