import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FilterPanel, type FilterCategory, type FilterControl } from "@gamemap/map-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@gamemap/ui";
import { getCategoryIcon } from "@/features/map/categoryIcons";
import { useGameMap } from "@/context/GameMapContext";
import { useGameData } from "@/context/GameDataContext";
import { useMarkers } from "@/context/MarkersContext";
import { parseIconUrl } from "@/lib/url";

// Old getCommonButtonProps colours: inactive = var(--color-sidebar-button) bg,
// #3D3D3D text (#C2C2C2 dark); active = primary blue (light) / violet (dark).
const BUTTON_SKIN = "bg-[color:var(--color-sidebar-button)] text-[#3D3D3D] dark:text-[#C2C2C2]";
const BUTTON_SKIN_ACTIVE = "bg-primary text-white dark:bg-[#7E52C1] dark:text-white";

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

  const filterCategories: FilterCategory[] = renderableCategories.map((category) => {
    const CatIcon = getCategoryIcon(category.name);
    return {
      id: category.name,
      label: t(`types:categories.${category.name}.name`, category.name),
      icon: <CatIcon className="h-3.5 w-3.5" />,
      subtypes: category.subtypes
        .filter((sub) => (subtypeCounts[sub.name] ?? 0) > 0)
        .map((sub) => {
          const total = subtypeCounts[sub.name] ?? 0;
          const completed = completedCounts[sub.name] ?? 0;
          const iconName = sub.icon || category.icon || "";
          const iconSize = (sub.iconScale || 1.0) * 20;
          return {
            id: sub.name,
            label: t(`types:subtypes.${sub.name}.name`, sub.name),
            active: visibleSubtypes?.has(sub.name) ?? false,
            badge: sub.canComplete === true ? `${completed}/${total}` : String(total),
            icon:
              iconName && selectedMap ? (
                <div className="relative flex h-5 w-5 items-center justify-center overflow-visible">
                  <img
                    src={parseIconUrl(iconName, selectedMap)}
                    alt=""
                    className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
                    style={{ width: iconSize, height: iconSize }}
                  />
                </div>
              ) : undefined,
          };
        }),
    };
  });

  const onSetCategory = (categoryId: string, visible: boolean) => {
    const category = types.find((c) => c.name === categoryId);
    if (!category) return;
    const subtypeKeys = category.subtypes
      .map((s) => s.name)
      .filter((k) => (subtypeCounts[k] ?? 0) > 0);
    for (const k of subtypeKeys) {
      const isVisible = visibleSubtypes?.has(k) ?? false;
      if (visible && !isVisible) handleToggleSubtype(k);
      if (!visible && isVisible) handleToggleSubtype(k);
    }
  };

  const controls: FilterControl[] = [
    {
      id: "show-all",
      label: t("common:menu.showAllMarkers", "Show all"),
      onClick: handleShowAllSubtypes,
    },
    {
      id: "hide-all",
      label: t("common:menu.hideAllMarkers", "Hide all"),
      onClick: handleHideAllSubtypes,
    },
    {
      id: "show-names",
      label: t("common:menu.showMarkerNames", "Show marker names"),
      onClick: () => setShowLabels(!showLabels),
      active: showLabels,
      testId: "show-names-toggle",
    },
    {
      id: "clear-completed",
      label: t("common:menu.clearMarkerCompleted", "Clear completed"),
      onClick: () => setConfirmOpen(true),
    },
    {
      id: "borders",
      label: t("common:menu.showBorders", "Show region borders"),
      onClick: handleToggleBorders,
      active: showBorders,
    },
    {
      id: "lod",
      label: t("common:menu.lodToggle", "Auto detail by zoom"),
      onClick: () => setLodEnabled(!lodEnabled),
      active: lodEnabled,
      testId: "lod-toggle",
    },
  ];

  return (
    <div className="flex w-full flex-col px-4 pb-4">
      <FilterPanel
        categories={filterCategories}
        onToggleSubtype={handleToggleSubtype}
        onSetCategory={onSetCategory}
        categoryToggleLabels={{
          show: t("common:menu.showCategory", "Show all in this category"),
          hide: t("common:menu.hideCategory", "Hide all in this category"),
        }}
        controls={controls}
        classNames={{
          controlButton: BUTTON_SKIN,
          controlButtonActive: BUTTON_SKIN_ACTIVE,
          subtypeButton: BUTTON_SKIN,
          subtypeButtonActive: BUTTON_SKIN_ACTIVE,
          categoryEyeToggle: "text-[#3D3D3D] dark:text-[#C2C2C2]",
        }}
      />

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
