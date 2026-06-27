import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import SelectMap from "./SelectMap";
import MarkerSearch from "./MarkerSearch";
import MarkerTypes from "./MarkerTypes";
import RegionFilter from "./RegionFilter";

type Props = {
  onSelectMarker: (id: string | null) => void;
  onFlyTo: (pos: { x: number; y: number }) => void;
};

export default function Sidebar({ onSelectMarker, onFlyTo }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation(["common"]);

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-border bg-card text-card-foreground transition-[width] duration-300"
      style={{ width: collapsed ? 0 : 320 }}
    >
      {!collapsed && (
        <ScrollArea className="h-full w-[320px]">
          <div className="flex flex-col gap-4 p-4">
            <SelectMap />
            <Separator />
            <MarkerSearch onSelectMarker={onSelectMarker} onFlyTo={onFlyTo} />
            <Separator />
            <MarkerTypes />
            <Separator />
            <RegionFilter />
          </div>
        </ScrollArea>
      )}

      <Button
        variant="secondary"
        size="icon"
        data-testid="sidebar-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={
          collapsed
            ? t("common:menu.expand", "Expand")
            : t("common:menu.collapse", "Collapse")
        }
        className="absolute top-4 left-full z-[1000] -translate-x-px rounded-l-none border border-l-0 border-border"
      >
        {collapsed ? (
          <ChevronRight className="size-4" />
        ) : (
          <ChevronLeft className="size-4" />
        )}
      </Button>
    </aside>
  );
}
