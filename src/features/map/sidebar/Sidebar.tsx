import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import SelectMap from "./SelectMap";
import MarkerTypes from "./MarkerTypes";
import ControlCluster from "./ControlCluster";
import RegionFilter from "./RegionFilter";

const SIDEBAR_WIDTH = 280;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [typesOpen, setTypesOpen] = useState(true);
  const { t } = useTranslation(["common"]);

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-[rgba(0,0,0,0.06)] bg-background text-foreground transition-[width] duration-300"
      style={{ width: collapsed ? 0 : SIDEBAR_WIDTH }}
    >
      {!collapsed && (
        <ScrollArea className="h-full" style={{ width: SIDEBAR_WIDTH }}>
          <div className="flex flex-col gap-4 px-4 py-4">
            {/* Title */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold tracking-tight text-[#2E97FF]">
                AION2
              </span>
              <span className="text-sm font-medium text-[#3D3D3D]">
                {t("common:appName", "AION2 Map")}
              </span>
            </div>

            {/* Race + Map dual selector */}
            <div className="rounded-lg border border-[rgba(46,151,255,0.25)] bg-white px-1">
              <SelectMap />
            </div>

            {/* Marker types section header with collapse chevron */}
            <button
              type="button"
              onClick={() => setTypesOpen((o) => !o)}
              className="flex items-center justify-between text-[13px] font-semibold text-[#3D3D3D]"
            >
              <span>{t("common:menu.markerTypes", "Marker Types")}</span>
              <ChevronDown
                className={cn(
                  "size-4 text-[rgba(0,0,0,0.45)] transition-transform",
                  !typesOpen && "-rotate-90",
                )}
              />
            </button>

            {typesOpen && (
              <>
                <ControlCluster />
                <div className="h-px bg-[rgba(0,0,0,0.06)]" />
                <MarkerTypes />
                <RegionFilter />
              </>
            )}
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
