import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { getCategoryIcon } from "@/features/map/categoryIcons";
import { useGameMap } from "@/context/GameMapContext";
import { useGameData } from "@/context/GameDataContext";
import { useMarkers } from "@/context/MarkersContext";
import { parseIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Flat sidebar button matching the old getCommonButtonProps colours:
 *  - active   = solid primary, text-background
 *  - inactive = bg var(--color-sidebar-button), text #3D3D3D (old default-700)
 */
function buttonClasses(active: boolean) {
  return cn(
    "flex h-[30px] w-full items-center gap-2 rounded-sm px-2 text-sm font-normal leading-[14px] transition-colors",
    // Active = primary blue (light) / violet (dark 魔族 board); inactive text is
    // #3D3D3D on light, #C2C2C2 on dark so it stays legible on the dark sidebar.
    active
      ? "bg-primary text-white dark:bg-[#7E52C1]"
      : "text-[#3D3D3D] dark:text-[#C2C2C2]",
  );
}

const inactiveStyle: React.CSSProperties = {
  background: "var(--color-sidebar-button)",
};

export default function MarkerTypes() {
  const { types, selectedMap } = useGameMap();
  const {
    handleShowAllSubtypes,
    handleHideAllSubtypes,
    visibleSubtypes,
    handleToggleSubtype,
    showBorders,
    handleToggleBorders,
    lodEnabled,
    setLodEnabled,
  } = useGameData();
  const { clearMarkerCompleted, showLabels, setShowLabels, subtypeCounts, completedCounts } =
    useMarkers();
  const { t } = useTranslation(["common", "types"]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Categories that have at least one subtype with a non-zero count.
  const renderableCategories = types.filter((category) =>
    category.subtypes.some((s) => (subtypeCounts[s.name] ?? 0) > 0),
  );

  // All categories expanded by default. Markers (and thus subtypeCounts) load
  // async, so the renderable set is empty on first render; keep the expanded
  // set in sync as categories appear, while preserving user collapses.
  const [expanded, setExpanded] = useState<string[]>([]);
  useEffect(() => {
    setExpanded((prev) => {
      const known = new Set(prev);
      const next = [...prev];
      for (const c of renderableCategories) {
        if (!known.has(c.name)) next.push(c.name);
      }
      return next.length === prev.length ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderableCategories.map((c) => c.name).join("|")]);

  return (
    <div className="flex w-full flex-col px-4 pb-4">
      {/* --- Control cluster: two-per-row button grid --- */}
      <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
        <button
          type="button"
          className={buttonClasses(false)}
          style={inactiveStyle}
          onClick={handleShowAllSubtypes}
        >
          {t("common:menu.showAllMarkers", "Show all")}
        </button>
        <button
          type="button"
          className={buttonClasses(false)}
          style={inactiveStyle}
          onClick={handleHideAllSubtypes}
        >
          {t("common:menu.hideAllMarkers", "Hide all")}
        </button>
        <button
          type="button"
          data-testid="show-names-toggle"
          aria-pressed={showLabels}
          className={buttonClasses(showLabels)}
          style={showLabels ? undefined : inactiveStyle}
          onClick={() => setShowLabels(!showLabels)}
        >
          {t("common:menu.showMarkerNames", "Show marker names")}
        </button>
        <button
          type="button"
          className={buttonClasses(false)}
          style={inactiveStyle}
          onClick={() => setConfirmOpen(true)}
        >
          {t("common:menu.clearMarkerCompleted", "Clear completed")}
        </button>
        <button
          type="button"
          className={buttonClasses(showBorders)}
          style={showBorders ? undefined : inactiveStyle}
          onClick={handleToggleBorders}
        >
          {t("common:menu.showBorders", "Show region borders")}
        </button>
        <button
          type="button"
          data-testid="lod-toggle"
          aria-pressed={lodEnabled}
          className={buttonClasses(lodEnabled)}
          style={lodEnabled ? undefined : inactiveStyle}
          onClick={() => setLodEnabled(!lodEnabled)}
        >
          {t("common:menu.lodToggle", "Auto detail by zoom")}
        </button>
      </div>

      {/* --- Collapsible marker-type categories --- */}
      <Accordion
        type="multiple"
        value={expanded}
        onValueChange={setExpanded}
        className="w-full"
      >
        {renderableCategories.map((category) => {
          const subtypeKeys = category.subtypes
            .map((s) => s.name)
            .filter((k) => (subtypeCounts[k] ?? 0) > 0);

          const allVisible =
            subtypeKeys.length > 0 &&
            subtypeKeys.every((k) => visibleSubtypes?.has(k));
          const anyVisible =
            subtypeKeys.length > 0 &&
            subtypeKeys.some((k) => visibleSubtypes?.has(k));

          // Three visual states for the eye toggle:
          //  none → faded eye  ·  some → solid eye  ·  all → solid eye w/ hide mark
          const eyeState = allVisible ? "all" : anyVisible ? "some" : "none";

          const tooltipText = allVisible
            ? t("common:menu.hideCategory", "Hide all in this category")
            : t("common:menu.showCategory", "Show all in this category");

          const toggleCategory = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const wantShow = !allVisible;
            for (const k of subtypeKeys) {
              const isVisible = visibleSubtypes?.has(k) ?? false;
              if (wantShow && !isVisible) handleToggleSubtype(k);
              if (!wantShow && isVisible) handleToggleSubtype(k);
            }
          };

          const CatIcon = getCategoryIcon(category.name);

          return (
            <AccordionItem
              key={category.name}
              value={category.name}
              className="border-b-0"
            >
              <AccordionTrigger className="cursor-default items-center gap-1 px-0 pt-3 pb-0 hover:no-underline [&>svg]:translate-y-0">
                <div className="my-2 flex w-full items-center justify-between gap-2 px-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center">
                      {/* Inherit the category title's text color (currentColor). */}
                      <CatIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm font-medium leading-[14px]">
                      {t(`types:categories.${category.name}.name`, category.name)}
                    </span>
                  </div>

                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={toggleCategory}
                          className={cn(
                            "shrink-0 rounded-sm p-1 text-[#3D3D3D] transition-opacity hover:bg-black/5 dark:text-[#C2C2C2] dark:hover:bg-white/10",
                            // State 1 (nothing selected): faded eye.
                            eyeState === "none" && "opacity-40",
                          )}
                          aria-label={tooltipText}
                        >
                          {/* State 3 (all selected): solid eye with hide mark.
                              States 1 & 2: eye (faded / solid via opacity above). */}
                          {eyeState === "all" ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{tooltipText}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pt-0 pb-0">
                <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
                  {category.subtypes.map((sub) => {
                    const total = subtypeCounts[sub.name] ?? 0;
                    if (total === 0) return null;
                    const completed = completedCounts[sub.name] ?? 0;
                    const active = visibleSubtypes?.has(sub.name) ?? false;
                    const canComplete = sub.canComplete === true;
                    const iconName = sub.icon || category.icon || "";
                    const iconSize = (sub.iconScale || 1.0) * 20;

                    return (
                      <button
                        type="button"
                        key={sub.name}
                        data-testid={`subtype-toggle-${sub.name}`}
                        aria-pressed={active}
                        onClick={() => handleToggleSubtype(sub.name)}
                        className={buttonClasses(active)}
                        style={active ? undefined : inactiveStyle}
                      >
                        <div
                          className={cn(
                            "flex w-full items-center justify-between",
                            active
                              ? "text-white"
                              : "text-[#3D3D3D] dark:text-[#C2C2C2]",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-1">
                            {iconName && selectedMap && (
                              <div className="relative flex h-5 w-5 items-center justify-center overflow-visible">
                                <img
                                  src={parseIconUrl(iconName, selectedMap)}
                                  alt=""
                                  className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
                                  style={{ width: iconSize, height: iconSize }}
                                />
                              </div>
                            )}
                            <span className="truncate text-left">
                              {t(`types:subtypes.${sub.name}.name`, sub.name)}
                            </span>
                          </span>
                          <span className="ml-2 shrink-0 text-xs">
                            {canComplete ? `${completed}/${total}` : total}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common:menu.clearMarkerCompleted", "Clear completed")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "common:menu.clearMarkerCompletedBody",
                "Do you want to clear all completed marker in this map?",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:ui.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearMarkerCompleted()}>
              {t("common:ui.confirm", "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
