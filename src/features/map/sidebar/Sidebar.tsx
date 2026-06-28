import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/context/ThemeContext";
import { useGameMap } from "@/context/GameMapContext";
import { useGameData } from "@/context/GameDataContext";
import { getStaticUrl } from "@/lib/url";
import Logo from "./Logo";
import SelectMap from "./SelectMap";
import MarkerTypes from "./MarkerTypes";

const SIDEBAR_WIDTH = 370;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation(["common"]);
  const { realTheme } = useTheme();
  const { selectedMap } = useGameMap();
  const { lodEnabled, setLodEnabled } = useGameData();

  const isLight = realTheme === "light";
  const bgUrl = getStaticUrl(
    isLight ? "images/Sidebar_Light.webp" : "images/Sidebar_Dark.webp",
  );

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col text-foreground transition-all duration-300"
      style={{
        width: collapsed ? 0 : SIDEBAR_WIDTH,
        maxWidth: SIDEBAR_WIDTH,
        backgroundImage: "var(--background-image-sidebar)",
      }}
    >
      {/* Theme-aware background image overlay (top-left). */}
      <div
        className="pointer-events-none absolute inset-0 bg-no-repeat opacity-70"
        style={{
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: "370px auto",
          backgroundPosition: "top left",
        }}
      />

      {/* CONTENT */}
      <ScrollArea className="h-full flex-1">
        {!collapsed && (
          <div className="flex flex-col px-0 pb-4">
            {/* LOD (auto-detail-by-zoom) toggle — top of the sidebar */}
            <label className="flex items-center justify-between gap-2 px-2 pt-3 text-sm text-[#3D3D3D]">
              <span className="leading-[14px]">
                {t("common:menu.lodToggle", "Auto detail by zoom")}
              </span>
              <Switch
                data-testid="lod-toggle"
                checked={lodEnabled}
                onCheckedChange={setLodEnabled}
              />
            </label>
            <Logo />
            <SelectMap />
            {selectedMap && <MarkerTypes />}
          </div>
        )}
      </ScrollArea>

      {/* WHOLE-SIDEBAR COLLAPSE BUTTON (right edge) */}
      <button
        type="button"
        data-testid="sidebar-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={
          collapsed
            ? t("common:menu.expand", "Expand")
            : t("common:menu.collapse", "Collapse")
        }
        className="absolute top-[100px] right-0 z-[20000] flex h-12 w-8 translate-x-full select-none flex-col items-center justify-center rounded-r-md rounded-l-none text-[#3D3D3D]"
        style={{ background: "var(--color-sidebar-collapse)" }}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
        <span className="mt-0.5 whitespace-normal px-0.5 text-center text-[10px] leading-tight">
          {collapsed
            ? t("common:menu.expand", "Expand")
            : t("common:menu.collapse", "Collapse")}
        </span>
      </button>
    </aside>
  );
}
