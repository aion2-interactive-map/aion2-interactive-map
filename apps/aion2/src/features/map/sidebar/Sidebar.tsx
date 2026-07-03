import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { ShellSidebar } from "@gamemap/map-shell";
import { useTheme } from "@/context/ThemeContext";
import { useGameMap } from "@/context/GameMapContext";
import { getStaticUrl } from "@/lib/url";
import Logo from "./Logo";
import SelectMap from "./SelectMap";
import MarkerTypes from "./MarkerTypes";

export default function Sidebar() {
  const { t } = useTranslation(["common"]);
  const { realTheme } = useTheme();
  const { selectedMap } = useGameMap();

  const isLight = realTheme === "light";
  const bgUrl = getStaticUrl(
    isLight ? "images/Sidebar_Light.webp" : "images/Sidebar_Dark.webp",
  );

  return (
    <ShellSidebar
      collapseLabel={t("common:menu.collapse", "Collapse")}
      expandLabel={t("common:menu.expand", "Expand")}
      classNames={{
        root: "text-foreground bg-[image:var(--background-image-sidebar)]",
        collapseButton: "text-[#3D3D3D] bg-[color:var(--color-sidebar-collapse)]",
      }}
      backgroundSlot={
        <div
          className="pointer-events-none absolute inset-0 bg-no-repeat opacity-70"
          style={{
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: "346px auto",
            backgroundPosition: "top left",
          }}
        />
      }
      headerSlot={<Logo />}
      mapSelectorSlot={<SelectMap />}
    >
      {selectedMap && (
        <div className="w-full">
          {/* Static section header — no longer collapsible. */}
          <div className="flex items-center gap-2 px-4 py-4">
            <span className="flex h-4 w-4 items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 fill-primary text-primary" />
            </span>
            <span className="truncate text-base font-bold leading-[16px]">
              {t("common:menu.markerTypes", "Marker Types")}
            </span>
          </div>
          <MarkerTypes />
        </div>
      )}
    </ShellSidebar>
  );
}
