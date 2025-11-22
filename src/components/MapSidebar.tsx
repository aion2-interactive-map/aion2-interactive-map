// src/components/MapSidebar.tsx
import React, {useState} from "react";
import {
  Button,
  Spinner,
  Switch,
  Accordion,
  AccordionItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody, ModalFooter
} from "@heroui/react";
import {useTranslation} from "react-i18next";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faChevronLeft, faChevronRight} from "@fortawesome/free-solid-svg-icons";

import type {GameMapMeta, MarkerTypeCategory, RegionInstance} from "../types/game";
import {parseIconUrl} from "../utils/url.ts";

type Props = {
  maps: GameMapMeta[];
  regions: RegionInstance[];
  types: MarkerTypeCategory[];
  selectedMapId: string | null;
  onMapChange: (id: string) => void;
  loadingMarkers: boolean;
  subtypeCounts: Map<string, number>;
  completedCounts: Map<string, number>;

  visibleSubtypes: Set<string>;
  onToggleSubtype: (subtypeId: string) => void;

  visibleRegions: Set<string>;
  onToggleRegion: (regionId: string) => void;

  showLabels: boolean;
  onToggleShowLabels: (value: boolean) => void;

  onShowAllSubtypes: () => void;
  onHideAllSubtypes: () => void;

  collapsed: boolean;
  onToggleCollapsed: () => void;

  onClearMarkerCompleted: () => void;
};

const MapSidebar: React.FC<Props> = ({
                                       maps,
                                       regions,
                                       types,
                                       selectedMapId,
                                       onMapChange,
                                       loadingMarkers,
                                       subtypeCounts,
                                       completedCounts,
                                       visibleSubtypes,
                                       onToggleSubtype,
                                       visibleRegions,
                                       onToggleRegion,
                                       showLabels,
                                       onToggleShowLabels,
                                       onShowAllSubtypes,
                                       onHideAllSubtypes,
                                       collapsed,
                                       onToggleCollapsed,
                                       onClearMarkerCompleted,
                                     }) => {
  const selectedMap = maps.find(m => m.name === selectedMapId);
  const [isClearCompletedModalOpen, setIsClearCompletedModalOpen] = useState(false);

  const regionNs = `regions/${selectedMapId}`;
  const {t} = useTranslation(regionNs);

  return (
    <aside
      className={`
    relative h-full border-r border-default bg-content1
    transition-all duration-300 flex flex-col space-y-2
    ${collapsed ? "w-[0px]" : "w-96 px-2 py-2"}
  `}
    >
      {/* Collapse handle */}
      <button
        onClick={onToggleCollapsed}
        className="
      absolute top-1/2 -right-4 transform -translate-y-1/2
      z-20000
      bg-background border border-default shadow-md
      h-8 w-8 rounded-full flex items-center justify-center
      hover:bg-primary hover:text-primary-foreground
      transition-colors
    "
      >
        <FontAwesomeIcon
          icon={collapsed ? faChevronRight : faChevronLeft}
          className="text-[20px]"
        />
      </button>

      {/* Sidebar content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
          <Accordion
            variant="shadow"
            selectionMode="multiple"
            defaultExpandedKeys={["maps", "types"]}
            itemClasses={{
              base: "bg-content1",
              title: "text-sm font-semibold",
              content: "pt-2 space-y-2",
            }}
          >
          {/* Map selection */}
            <AccordionItem key="maps" aria-label="Maps" title={t("common:menu.maps")}>
            <div className="grid grid-cols-2 gap-2">
              {maps.map((map) => {
                const isActive = map.name === selectedMapId;

                return (
                  <Button
                    key={map.name}
                    size="sm"
                    variant={isActive ? "flat" : "light"}
                    onPress={() => onMapChange(map.name)}
                    className={[
                      "flex items-center justify-between text-xs px-2 py-1 rounded border transition-colors h-auto w-full",
                      isActive
                        ? "bg-default-100 border-default-300"
                        : "bg-content1 border-default-200 opacity-60 hover:opacity-80",
                    ].join(" ")}
                  >
                    <span className="truncate text-left">
                      {t(`maps:${map.name}.name`, map.name)}
                    </span>
                  </Button>
                );
              })}
              {maps.length === 0 && (
                <p className="text-xs text-default-500">
                  No maps loaded.
                </p>
              )}
            </div>
          </AccordionItem>

          {/* Marker types */}
          {selectedMap ? (
            <AccordionItem
              key="types"
              aria-label="Marker Types"
              title={t("common:menu.markerTypes", "Marker Types")}
            >
              {/* Loading state */}
              {loadingMarkers && (
                <div className="flex items-center gap-2 text-xs text-default-500 mb-2">
                  <Spinner size="sm" />
                  <span>{t("common:loadingMarkers", "Loading markers…")}</span>
                </div>
              )}

              {/* Show/Hide buttons */}
              <div className="flex items-center justify-start gap-2 pb-2">
                <Button size="sm" variant="light" onPress={onShowAllSubtypes}>
                  {t("common:menu.showAllMarkers", "Show all")}
                </Button>
                <Button size="sm" variant="light" onPress={onHideAllSubtypes}>
                  {t("common:menu.hideAllMarkers", "Hide all")}
                </Button>
              </div>

              {/* Categories as nice static containers */}
              <div className="flex flex-col gap-3">
                {types.filter(x => x.subtypes.length > 0).map((cat) => (
                  <div
                    key={cat.name}
                    className="rounded-lg border border-default-200 bg-content2/60"
                  >
                    {/* Category header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-default-200">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Optional category icon */}
                        {cat.icon && selectedMap && (
                          <div className="relative w-5 h-5 overflow-visible flex items-center justify-center">
                            <img
                              src={parseIconUrl(cat.icon, selectedMap)}
                              alt=""
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none"
                              style={{ width: 20, height: 20 }}
                            />
                          </div>
                        )}
                        <span className="text-xs font-semibold truncate">
              {t(`types:categories.${cat.name}.name`, cat.name)}
            </span>
                      </div>
                    </div>

                    {/* Subtype buttons */}
                    <div className="grid grid-cols-2 gap-1 p-2">
                      {cat.subtypes.map((sub) => {
                        const key = sub.name;
                        const total = subtypeCounts.get(key) ?? 0;
                        const completed = completedCounts.get(key) ?? 0;
                        const active = visibleSubtypes.has(key);
                        const canComplete = sub.canComplete === true;
                        const iconName = sub.icon || cat.icon || "";
                        const iconSize = (sub.iconScale || 1.0) * 20;

                        return (
                          <Button
                            key={sub.name}
                            size="sm"
                            variant={active ? "flat" : "light"}
                            onPress={() => onToggleSubtype(sub.name)}
                            className={[
                              "flex items-center justify-between text-xs px-2 py-1 rounded border transition-colors h-auto w-full",
                              active
                                ? "bg-default-100 border-default-300"
                                : "bg-content1 border-default-200 opacity-60 hover:opacity-80",
                            ].join(" ")}
                          >
                <span className="flex items-center gap-1 min-w-0">
                  {iconName && selectedMap && (
                    <div className="relative w-5 h-5 overflow-visible flex items-center justify-center">
                      <img
                        src={parseIconUrl(iconName, selectedMap)}
                        alt=""
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none"
                        style={{ width: iconSize, height: iconSize }}
                      />
                    </div>
                  )}
                  <span className="truncate text-left">
                    {t(`types:subtypes.${sub.name}.name`, sub.name)}
                  </span>
                </span>

                            <span className="text-[12px] text-default-500 ml-2">
                  {canComplete ? `${completed}/${total}` : total}
                </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {types.length === 0 && !loadingMarkers && (
                  <p className="text-xs text-default-500">
                    {t("common:noMarkerTypes", "No marker types loaded.")}
                  </p>
                )}
              </div>

              {/* Label toggle */}
              <div className="mt-3 flex items-center justify-between">
                <Switch
                  size="sm"
                  isSelected={showLabels}
                  onValueChange={onToggleShowLabels}
                >
    <span className="text-xs text-default-600">
      {t("common:menu.showNamesOnPins", "Show names on pins")}
    </span>
                </Switch>

                {/* Clear all marks button */}
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => setIsClearCompletedModalOpen(true)}
                >
                  {t("common:menu.clearMarkerCompleted")}
                </Button>
              </div>
            </AccordionItem>
          ) : null}

            {/* Regions */}
            {selectedMap ? (
              <AccordionItem
                key="regions"
                aria-label="Regions"
                title={t("common:menu.regions")}
              >
                <div className="flex items-center justify-start gap-2 pb-2">
                  Testing feature ...
                </div>
                <div className="grid grid-cols-2 gap-2 p-1.5">
                  {regions.map((region) => {
                    const active = visibleRegions.has(region.name);
                    return (
                      <Button
                        key={region.name}
                        size="sm"
                        variant={active ? "flat" : "light"}
                        onPress={() => onToggleRegion(region.name)}
                        className={[
                          "flex items-center justify-between text-xs px-2 py-1 rounded border transition-colors h-auto",
                          active
                            ? "bg-default-100 border-default-300"
                            : "bg-content1 border-default-200 opacity-60 hover:opacity-80",
                        ].join(" ")}
                      >
                      <span className="flex items-center gap-1 min-w-0">
                        <span className="truncate text-left">
                          {t(
                            `${regionNs}:${region.name}.name`,
                            region.name,
                          )}
                        </span>
                      </span>
                      </Button>
                    );
                  })}
                </div>
              </AccordionItem>
            ) : null}

          </Accordion>
          <Modal
            isOpen={isClearCompletedModalOpen}
            onOpenChange={(open) => !open && setIsClearCompletedModalOpen(false)}
            classNames={{
              wrapper: "z-[20000]", // stay above map & tooltips
            }}
          >
            <ModalContent>
              {(close) => (
                <>
                  <ModalHeader>{t("common:menu.clearMarkerCompleted")}</ModalHeader>
                  <ModalBody>{t("common:menu.clearMarkerCompletedBody")}</ModalBody>
                  <ModalFooter>
                    <Button variant="light" onPress={close}>
                      {t("common:ui.cancel")}
                    </Button>
                    <Button
                      color="danger"
                      onPress={() => {
                        onClearMarkerCompleted();
                        close();
                      }}
                    >
                      {t("common:ui.confirm")}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </div>
      )}
    </aside>
  );
};

export default MapSidebar;
