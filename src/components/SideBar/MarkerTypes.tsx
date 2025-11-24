// src/components/MarkerTypes.tsx

import React, {useState} from "react";
import {Button, Switch} from "@heroui/react";
import {useTranslation} from "react-i18next";
import {useGameData} from "@/context/GameDataContext.tsx";
import {useMarkers} from "@/context/MarkersContext.tsx";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {parseIconUrl} from "@/utils/url.ts";
import ConfirmClearCompletedModal from "@/components/SideBar/ConfirmClearCompletedModal.tsx";

const MarkerTypes: React.FC = () => {
  const {types, selectedMap} = useGameMap();
  const {handleShowAllSubtypes, handleHideAllSubtypes, visibleSubtypes, handleToggleSubtype} = useGameData();
  const {clearMarkerCompleted, showLabels, setShowLabels, subtypeCounts, completedCounts} = useMarkers();
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
      <div className="w-full flex flex-col gap-3 px-2 my-0">
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
            // variant={showLabels ? "solid" : "flat"}
            onPress={() => setShowLabels(!showLabels)}
          >
            <div className="flex items-center">
              <Switch
                size="sm"
                isSelected={showLabels}
                onValueChange={setShowLabels}
              />
            </div>
            {t("menu.showNamesOnPins", "Show Names")}
          </Button>
          <Button
            {...commonButtonProps}
            onPress={() => setModalOpen(true)}
          >
            {t("menu.clearMarkerCompleted", "Clear Completed")}
          </Button>
        </div>

        {types.filter(x => x.subtypes.length > 0).map((category) => (
          <div key={category.name}>
            <div className="my-2 text-[14px] leading-[14px] font-medium px-1">
              {t(`types:categories.${category.name}.name`, category.name)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {category.subtypes.map((subtype) => {
                const key = subtype.name;
                const total = subtypeCounts.get(key) ?? 0;
                const completed = completedCounts.get(key) ?? 0;
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

              })}
            </div>
          </div>
        ))}

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
