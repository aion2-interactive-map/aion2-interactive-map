import React, {useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faChevronLeft, faChevronRight} from "@fortawesome/free-solid-svg-icons";
import {getStaticUrl} from "@/utils/url.ts";
import {useTheme} from "@/context/ThemeContext";

type SidebarWrapperProps = {
  side: "left" | "right";       // determines positioning & button direction
  width?: number;               // expanded width (default 370)
  collapsedWidth?: number;      // collapsed width (default 0)
  children: React.ReactNode;
};

const SidebarWrapper: React.FC<SidebarWrapperProps> = ({
                                                         side = "left",
                                                         width = 370,
                                                         collapsedWidth = 0,
                                                         children,
                                                       }) => {
  const [collapsed, setCollapsed] = useState(false);
  const {theme} = useTheme();
  const isDark = theme === "dark";
  const bgUrl = getStaticUrl(isDark ? "images/Sidebar_Dark.webp" : "images/Sidebar_Light.webp");
  const isLeft = side === "left";

  // Collapse button click
  const toggle = () => setCollapsed((v) => !v);

  return (
    <aside
      className={`
        relative h-full flex flex-col bg-sidebar transition-all duration-300 
        // ${isLeft ? "order-0" : "order-2"}
      `}
      style={{
        width: collapsed ? collapsedWidth : width,
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
          w-8 h-12 bg-[#D3E2EA] text-default-700 select-none
          ${isLeft ? "right-0 translate-x-full rounded-r-md rounded-l-none" : "left-0 -translate-x-full rounded-l-md rounded-r-none"}
        `}
      >
        <FontAwesomeIcon
          icon={isLeft ? (collapsed ? faChevronRight : faChevronLeft) : (collapsed ? faChevronLeft : faChevronRight)}
          className="text-sm"
        />
        {/* Multilingual safe label (wrap allowed) */}
        <span className="text-[10px] leading-tight mt-0.5 whitespace-normal text-center px-0.5">
          {collapsed ? (isLeft ? "展开" : "Expand") : (isLeft ? "收起" : "Collapse")}
        </span>
      </button>
    </aside>
  );
};

export default SidebarWrapper;
