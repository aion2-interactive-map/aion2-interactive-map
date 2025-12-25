// src/components/Sidebar/LeftSidebar.tsx
import React from "react";
import {useGameMap} from "@/context/GameMapContext.tsx";
import SidebarWrapper from "./SidebarWrapper";
import Logo from "./Logo.tsx";
import SelectMap from "@/components/SideBar/SelectMap.tsx";
import MarkerTypes from "@/components/SideBar/MarkerTypes.tsx";

import {Accordion, AccordionItem, Tooltip} from "@heroui/react";
import {useTranslation} from "react-i18next";
import {makeAccordionTitle} from "@/components/SideBar/makeAccordionTitle.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {useUserMarkers} from "@/context/UserMarkersContext.tsx";
import MarkerSearch from "@/components/SideBar/MarkerSearch.tsx";
import {useTheme} from "@/context/ThemeContext.tsx";

type LeftSidebarProps = {
  onSelectMarker?: (markerId: string) => void;
  onSelectPosition?: (x: number, y: number) => void;
};


const LeftSidebar: React.FC<LeftSidebarProps> = ({onSelectMarker, onSelectPosition}) => {
  const {t} = useTranslation();
  const {realTheme} = useTheme();
  const {selectedMap} = useGameMap();
  const {setPickMode} = useUserMarkers();

  return (
    <SidebarWrapper
      side="left"
      width={370}
      extraControls={
        <Tooltip
          content={t("common:markerActions.createUserMarker", "Create a user marker")}
          placement="right"
          delay={300}
          // radius="none"
        >
          <button
            type="button"
            onClick={() => setPickMode(true)}
            className="
              w-8 h-12 bg-sidebar-collapse text-default-700
              flex items-center justify-center rounded-r-md
            "
          >
            <img
              src={getStaticUrl(realTheme == "light" ? "images/LocationAddLight.webp" : "images/LocationAddDark.webp")}
              alt={t("common:markerActions.createUserMarker")}
              className="w-5 h-5 object-contain"
            />
          </button>
        </Tooltip>
      }
    >
      <div className="flex flex-col h-full relative">
        <div
          className={
            "flex-1 px-0 pb-4"
          }
        >
          <Logo/>
          <SelectMap/>
          <MarkerSearch onSelectMarker={onSelectMarker} onSelectPosition={onSelectPosition}/>
          <Accordion
            variant="shadow"
            selectionMode="multiple"
            defaultExpandedKeys={["maps", "types"]}
            itemClasses={{
              base: "!bg-transparent !shadow-none !backdrop-filter-none !backdrop-blur-none",
              trigger: "py-4 min-h-0 px-2",
              title: "text-[16px] leading-[16px] font-bold",
              content: "py-0",
            }}
            className="bg-transparent shadow-none"
          >
            {selectedMap ? (
              <AccordionItem
                key="types"
                title={makeAccordionTitle(
                  t("common:menu.markerTypes", "Marker Types"),
                )}
                classNames={{
                  indicator: "text-default-700",
                }}
              >
                <MarkerTypes/>
              </AccordionItem>
            ) : null}
          </Accordion>
        </div>
      </div>

    </SidebarWrapper>
  );
};

export default LeftSidebar;
