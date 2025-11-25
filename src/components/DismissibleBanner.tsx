// src/components/common/DismissibleBanner.tsx
import React, {useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faTimes} from "@fortawesome/free-solid-svg-icons";

type BannerPosition =
  | "bottom-center"
  | "middle-center"
  | "bottom-left"
  | "bottom-right"
  | "middle-left"
  | "middle-right";

type Props = {
  href?: string;
  imageUrl: string;
  height?: number;       // default 120px
  width?: number;        // default 800px
  position?: BannerPosition;
  offsetY?: number;      // extra vertical offset (default varies by position)
};

const DismissibleBanner: React.FC<Props> = ({
                                              href,
                                              imageUrl,
                                              width = 800,
                                              height = 120,
                                              position = "bottom-center",
                                              offsetY,
                                            }) => {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  // --- POSITIONING LOGIC -----------------------------------------------------
  let positionClasses = "";
  let translateX = "";
  let translateY = "";

  switch (position) {
    case "bottom-center":
      positionClasses = "fixed left-1/2 bottom-6";
      translateX = "-translate-x-1/2";
      break;

    case "middle-center":
      positionClasses = "fixed left-1/2 top-1/2";
      translateX = "-translate-x-1/2";
      translateY = "-translate-y-1/2";
      break;

    case "bottom-left":
      positionClasses = "fixed left-6 bottom-6";
      break;

    case "bottom-right":
      positionClasses = "fixed right-6 bottom-6";
      break;

    case "middle-left":
      positionClasses = "fixed left-6 top-1/2";
      translateY = "-translate-y-1/2";
      break;

    case "middle-right":
      positionClasses = "fixed right-6 top-1/2";
      translateY = "-translate-y-1/2";
      break;
  }

  // offset override
  const extraOffsetStyle: React.CSSProperties = {};
  if (offsetY !== undefined) {
    extraOffsetStyle.marginTop = offsetY;
  }

  // --------------------------------------------------------------------------

  return (
    <div
      className={`
        ${positionClasses}
        ${translateX} ${translateY}
        z-[30000] shadow-xl rounded-lg overflow-hidden
      `}
      style={{
        ...extraOffsetStyle,
        width,
        height,
      }}
      datatype="advertisement"
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
      {/* Close button */}
      <button
        onClick={() => setVisible(false)}
        className="
          absolute top-2 left-2
          w-8 h-8 rounded-md
          bg-black/40 hover:bg-black/60
          flex items-center justify-center text-white
        "
      >
        <FontAwesomeIcon icon={faTimes} className="text-lg"/>
      </button>
    </div>
  );
};

export default DismissibleBanner;
