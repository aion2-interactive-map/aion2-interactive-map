import React, {useState} from "react";
import {useGameMap} from "@/context/GameMapContext.tsx";
import SidebarWrapper from "./SidebarWrapper";
import Logo from "./Logo.tsx";
import SelectMap from "@/components/SideBar/SelectMap.tsx";
import MarkerTypes from "@/components/SideBar/MarkerTypes.tsx";

import {Accordion, AccordionItem} from "@heroui/react";
import {useTranslation} from "react-i18next";
import {makeAccordionTitle} from "@/components/SideBar/makeAccordionTitle.tsx";
import BottomSidebarBanner from "@/components/SideBar/BottomSidebarBanner.tsx";
import {getStaticUrl} from "@/utils/url.ts";

const LeftSidebar: React.FC = () => {
  const {t} = useTranslation();
  const {selectedMap} = useGameMap();
  const [bannerVisible, setBannerVisible] = useState(true);

  return (
    <SidebarWrapper side="left" width={370}>
      <div className="flex flex-col h-full relative">
        <div
          className={
            "flex-1 overflow-y-auto px-0 " +
            (bannerVisible ? "pb-[240px]" : "pb-4")
          }
        >
          <Logo/>
          <SelectMap/>
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
              <AccordionItem key="types" title={makeAccordionTitle(t("common:menu.markerTypes", "Marker Types"))}>
                <MarkerTypes/>
              </AccordionItem>
            ) : null}
          </Accordion>
        </div>
      </div>

      {import.meta.env.VITE_REGION === "CHINA" && (
        <BottomSidebarBanner
          href="https://www.pxb7.com/buy/175178554941486/1?channelId=184939419369543&activityCode=yhzt2sl"
          imageUrl={getStaticUrl("images/PangXieLeft.webp")}
          height={220}
          closeButtonPosition="top-left"
          onClose={() => setBannerVisible(false)}
        />
      )}
    </SidebarWrapper>
  );
};

export default LeftSidebar;
