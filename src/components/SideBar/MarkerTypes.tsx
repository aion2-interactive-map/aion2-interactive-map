// src/components/MarkerTypes.tsx

import React, {useState} from "react";
import {Accordion, AccordionItem, Button} from "@heroui/react";
import {useTranslation} from "react-i18next";
import {useGameData} from "@/context/GameDataContext.tsx";
import {useMarkers} from "@/context/MarkersContext.tsx";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {parseIconUrl} from "@/utils/url.ts";
import ConfirmClearCompletedModal from "@/components/SideBar/ConfirmClearCompletedModal.tsx";
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
  const {showUserMarkers, setShowUserMarkers} = useUserMarkers();
  const {t} = useTranslation("common");
  const [isModalOpen, setModalOpen] = useState(false);

  // 🔵 Shared props for all buttons
  const commonButtonProps = {
    radius: "sm" as const,
    fullWidth: true,
    className: "text-[14px] leading-[14px] font-normal h-[30px] gap-2 px-2",
    variant: "flat" as const,
  };

  return (
    <>
      <div className="w-full flex flex-col px-2 my-0 pb-4">
        {/* --- Two-per-row button grid --- */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            {...commonButtonProps}
            onPress={handleShowAllSubtypes}
          >
            {t("menu.showAllMarkers", "Show All")}
          </Button>
          <Button
            {...commonButtonProps}
            onPress={handleHideAllSubtypes}
          >
            {t("menu.hideAllMarkers", "Hide All")}
          </Button>
          <Button
            {...commonButtonProps}
            color={showLabels ? "primary" : "default"}
            variant={showLabels ? "solid" : "flat"}
            onPress={() => setShowLabels(!showLabels)}
            className={commonButtonProps.className + ` ${showLabels ? "text-background" : "text-default-700"}`}
          >
            {t("menu.showNamesOnPins", "Show Names")}
          </Button>
          <Button
            {...commonButtonProps}
            onPress={() => setModalOpen(true)}
          >
            {t("menu.clearMarkerCompleted", "Clear Completed")}
          </Button>
          <Button
            {...commonButtonProps}
            color={showBorders ? "primary" : "default"}
            variant={showBorders ? "solid" : "flat"}
            onPress={handleToggleBorders}
            className={commonButtonProps.className + ` ${showBorders ? "text-background" : "text-default-700"}`}
          >
            {t("menu.showBorders", "Show Borders")}
          </Button>
          <Button
            {...commonButtonProps}
            color={showUserMarkers ? "primary" : "default"}
            variant={showUserMarkers ? "solid" : "flat"}
            onPress={() => setShowUserMarkers(!showUserMarkers)}
            className={commonButtonProps.className + ` ${showUserMarkers ? "text-background" : "text-default-700"}`}
          >
            {t("menu.showUserMarkers", "Show User Markers")}
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
                  {...commonButtonProps}
                  className={commonButtonProps.className + " justify-start"}
                  onPress={() => {
                    handleToggleSubtype(subtype.name)
                  }}
                  color={active ? "primary" : "default"}
                  variant={active ? "solid" : "flat"}
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
                  <div className="my-2 text-[14px] leading-[14px] font-medium px-1">
                    {t(`types:categories.${category.name}.name`, category.name)}
                  </div>
                }
                hideIndicator
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
