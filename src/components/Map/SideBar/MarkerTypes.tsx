// src/components/MarkerTypes.tsx

import React, {useState} from "react";
import {Accordion, AccordionItem, Button, Tooltip} from "@heroui/react";
import {useTranslation} from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import {useGameData} from "@/context/GameDataContext.tsx";
import {useMarkers} from "@/context/MarkersContext.tsx";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {parseIconUrl} from "@/utils/url.ts";
import ConfirmClearCompletedModal from "@/components/Map/SideBar/ConfirmClearCompletedModal.tsx";
import {useUserMarkers} from "@/context/UserMarkersContext.tsx";

const MarkerTypes: React.FC = () => {
  const {types, selectedMap} = useGameMap();
  const {
    handleShowAllSubtypes,
    handleHideAllSubtypes,
    visibleSubtypes,
    handleToggleSubtype,
    showBorders,
    handleToggleBorders
  } = useGameData();
  const {clearMarkerCompleted, showLabels, setShowLabels, subtypeCounts, completedCounts} = useMarkers();
  const {hideUserMarkers, setHideUserMarkers} = useUserMarkers();
  const {t} = useTranslation("common");
  const [isModalOpen, setModalOpen] = useState(false);

  // 🔵 Shared props for all buttons
  const getCommonButtonProps = (isActive: boolean = false) => {
    const color: "primary" | "default" = isActive ? "primary" : "default";
    const variant: "solid" | "flat" = isActive ? "solid": "flat"
    const props = {
      radius: "sm" as const,
      fullWidth: true,
      className: "text-[14px] leading-[14px] font-normal h-[30px] gap-2 px-2",
      variant: variant,
      color: color,
    }
    if (!isActive) {
      props.className += " bg-sidebar-button text-default-700"
    } else {
      props.className += " text-background"
    }
    return props;
  }

  return (
    <>
      <div className="w-full flex flex-col px-2 my-0 pb-4">
        {/* --- Two-per-row button grid --- */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            {...getCommonButtonProps()}
            onPress={handleShowAllSubtypes}
          >
            {t("menu.showAllMarkers", "Show All")}
          </Button>
          <Button
            {...getCommonButtonProps()}
            onPress={handleHideAllSubtypes}
          >
            {t("menu.hideAllMarkers", "Hide All")}
          </Button>
          <Button
            {...getCommonButtonProps(showLabels)}
            onPress={() => setShowLabels(!showLabels)}
          >
            {t("menu.showNamesOnPins", "Show Names")}
          </Button>
          <Button
            {...getCommonButtonProps()}
            onPress={() => setModalOpen(true)}
          >
            {t("menu.clearMarkerCompleted", "Clear Completed")}
          </Button>
          <Button
            {...getCommonButtonProps(showBorders)}
            onPress={handleToggleBorders}
          >
            {t("menu.showBorders", "Show Borders")}
          </Button>
          <Button
            {...getCommonButtonProps(hideUserMarkers)}
            onPress={() => setHideUserMarkers(!hideUserMarkers)}
          >
            {t("menu.hideUserMarkers", "Hide User Markers")}
          </Button>
        </div>

        <Accordion
          variant="light"
          selectionMode="multiple"
          showDivider={false}
          defaultExpandedKeys={types.map(category => category.name)}
          itemClasses={{
            base: "!bg-transparent !shadow-none !backdrop-filter-none !backdrop-blur-none",
            trigger: "pt-3 pb-0 min-h-0 px-0",
            title: "text-[16px] leading-[16px] font-bold",
            content: "py-0",
          }}
          className="bg-transparent shadow-none px-0"
        >
          {types.filter(x => x.subtypes.length > 0).map((category) => {
            const subtypes = category.subtypes.map((subtype) => {
              const key = subtype.name;
              const total = subtypeCounts[key] ?? 0;
              if (total === 0) return null;
              const completed = completedCounts[key] ?? 0;
              const active = visibleSubtypes?.has(key) || false;
              const canComplete = subtype.canComplete === true;
              const iconName = subtype.icon || category.icon || "";
              const iconSize = (subtype.iconScale || 1.0) * 20;
              return (
                <Button
                  {...getCommonButtonProps(active)}
                  onPress={() => {
                    handleToggleSubtype(subtype.name)
                  }}
                >
                  <div className={`
                      flex w-full items-center justify-between
                      ${active ? "text-background" : "text-default-700"}
                    `}>
                    {/* Left side: icon + name */}
                    <span className="flex items-center gap-1 min-w-0">
                        {iconName && selectedMap && (
                          <div className="relative w-5 h-5 overflow-visible flex items-center justify-center">
                            <img
                              src={parseIconUrl(iconName, selectedMap)}
                              alt=""
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none"
                              style={{width: iconSize, height: iconSize}}
                            />
                          </div>
                        )}

                      <span className="truncate text-left">
                          {t(`types:subtypes.${subtype.name}.name`, subtype.name)}
                        </span>
                      </span>

                    {/* Right side: count */}
                    <span className="text-[12px] shrink-0 ml-2">
                        {canComplete ? `${completed}/${total}` : total}
                      </span>
                  </div>
                </Button>
              )
            }).filter(x => x !== null);
            if (subtypes.length === 0) return null;
            return (
              <AccordionItem
                key={category.name}
                title={
                  (() => {
                    // only include subtypes that actually render (total > 0)
                    const subtypeKeys = category.subtypes
                      .map((s) => s.name)
                      .filter((k) => (subtypeCounts[k] ?? 0) > 0);

                    const allVisible =
                      subtypeKeys.length > 0 && subtypeKeys.every((k) => visibleSubtypes?.has(k));

                    const anyVisible =
                      subtypeKeys.length > 0 && subtypeKeys.some((k) => visibleSubtypes?.has(k));

                    const icon = allVisible ? faEyeSlash : faEye;
                    const tooltipText = allVisible
                      ? t("menu.hideCategory", "Hide all in this category")
                      : t("menu.showCategory", "Show all in this category");

                    const toggleCategory = (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation(); // do not toggle accordion open/close

                      const wantShow = !allVisible;

                      // set each subtype to desired state by toggling only when needed
                      for (const k of subtypeKeys) {
                        const isVisible = visibleSubtypes?.has(k) ?? false;
                        if (wantShow && !isVisible) handleToggleSubtype(k);
                        if (!wantShow && isVisible) handleToggleSubtype(k);
                      }
                    };

                    return (
                      <div className="my-2 px-1 flex items-center justify-between gap-2">
                        <div className="text-[14px] leading-[14px] font-medium">
                          {t(`types:categories.${category.name}.name`, category.name)}
                        </div>

                        {/* Only show the icon if this category actually has renderable subtypes */}
                        {subtypeKeys.length > 0 && (
                          <Tooltip content={tooltipText} placement="top" delay={300}>
                            <button
                              type="button"
                              onClick={toggleCategory}
                              className={`shrink-0 p-1 rounded-sm hover:bg-default-100 ${
                                anyVisible ? "text-default-700" : "text-default-400"
                              }`}
                              aria-label={tooltipText}
                            >
                              <FontAwesomeIcon icon={icon} className="text-[13px]" />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })()
                }
                classNames={{
                  indicator: "text-default-700",
                }}
              >
                <div className="grid grid-cols-2 gap-2">
                  {subtypes}
                </div>
              </AccordionItem>

            )
          })}


        </Accordion>

      </div>

      <ConfirmClearCompletedModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={clearMarkerCompleted}
      />

    </>
  );
};

export default MarkerTypes;
