// src/components/Sidebar/BottomSidebarBanner.tsx
import React from "react";

type BottomSidebarBannerProps = {
  imageUrl: string;
  height: number;  // Banner height
};

const BottomSidebarBanner: React.FC<BottomSidebarBannerProps> = ({
                                                                   imageUrl,
                                                                   height,
                                                                 }) => {
  return (
    <div
      className="
        absolute bottom-4 mx-auto w-full
        flex items-center justify-center text-center
      "
      style={{ height }}
    >
      <img
        src={imageUrl}
        alt=""
        className="
          w-full h-full mx-auto
          object-contain
        "
      />
    </div>
  );
};

export default BottomSidebarBanner;
