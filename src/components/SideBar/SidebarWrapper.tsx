import React, {useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faChevronLeft, faChevronRight} from "@fortawesome/free-solid-svg-icons";
import {getStaticUrl} from "@/utils/url.ts";
import {useTheme} from "@/context/ThemeContext";
import {useTranslation} from "react-i18next";

type SidebarWrapperProps = {
  side: "left" | "right";       // determines positioning & button direction
  width?: number;               // expanded width (default 370)
  collapsedWidth?: number;      // collapsed width (default 0)
  collapsed?: boolean;
  children: React.ReactNode;
};

const SidebarWrapper: React.FC<SidebarWrapperProps> = ({
                                                         side = "left",
                                                         width = 370,
                                                         collapsedWidth = 0,
                                                         collapsed = false,
                                                         children,
                                                       }) => {
  const { t } = useTranslation("common");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(collapsed);
  const {theme} = useTheme();
  const isDark = theme === "dark";
  const bgUrl = getStaticUrl(isDark ? "images/Sidebar_Dark.webp" : "images/Sidebar_Light.webp");
  const isLeft = side === "left";

  // Collapse button click
  const toggle = () => setSidebarCollapsed((v) => !v);

  return (
    <aside
      className={`
        relative h-full flex flex-col bg-sidebar transition-all duration-300 
        // ${isLeft ? "order-0" : "order-2"}
      `}
      style={{
        width: sidebarCollapsed ? collapsedWidth : width,
        maxWidth: width, // ensures only right part of image is cut if narrow
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-70 bg-no-repeat bg-top-left"
        style={{
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: "370px auto",
        }}
      />


      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto">{children}</div>

      {/* COLLAPSE BUTTON */}
      <button
        onClick={toggle}
        className={`
          absolute top-[100px] flex flex-col items-center justify-center z-[20000] 
          w-8 h-12 bg-sidebar-collapse text-default-700 select-none
          ${isLeft ? "right-0 translate-x-full rounded-r-md rounded-l-none" : "left-0 -translate-x-full rounded-l-md rounded-r-none"}
        `}
      >
        <FontAwesomeIcon
          icon={isLeft ? (sidebarCollapsed ? faChevronRight : faChevronLeft) : (sidebarCollapsed ? faChevronLeft : faChevronRight)}
          className="text-sm"
        />
        {/* Multilingual safe label (wrap allowed) */}
        <span className="text-[10px] leading-tight mt-0.5 whitespace-normal text-center px-0.5">
          {sidebarCollapsed ? t("menu.expand", "Expand") : t("menu.collapse", "Collapse")}
        </span>
      </button>
    </aside>
  );
};

export default SidebarWrapper;
