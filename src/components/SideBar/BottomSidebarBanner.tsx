// src/components/Sidebar/BottomSidebarBanner.tsx
import React from "react";

type BottomSidebarBannerProps = {
  imageUrl: string;
  height: number;  // Banner height
  href: string;
};

const BottomSidebarBanner: React.FC<BottomSidebarBannerProps> = ({
                                                                   imageUrl,
                                                                   height,
                                                                   href,
                                                                 }) => {
  return (
    <div
      className="
        absolute bottom-4 mx-auto w-full
        flex items-center justify-center text-center
      "
      style={{ height }}
    >
      <a href={href} target="_blank">
        <img
          src={imageUrl}
          alt=""
          className="
            w-full h-full mx-auto
            object-contain
          "
        />
      </a>
    </div>
  );
};

export default BottomSidebarBanner;
