// src/components/common/DismissibleBottomBanner.tsx
import React, { useState } from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faTimes} from "@fortawesome/free-solid-svg-icons";

type Props = {
  imageUrl: string;            // background image
  height?: number;             // default = 120px
  width?: number;              // default = 800px
};

const DismissibleBottomBanner: React.FC<Props> = ({
                                                    imageUrl,
                                                    width = 800,
                                                    height = 120,
                                                  }) => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      className="fixed left-1/2 bottom-6 z-[30000] -translate-x-1/2 shadow-xl rounded-lg overflow-hidden"
      style={{
        width,
        height,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      {/* Close button */}
      <div className="absolute top-0 left-0">
        <button
          onClick={() => setVisible(false)}
          className="
          absolute top-2 left-2
          w-8 h-8
          rounded-md
          bg-black/40 hover:bg-black/60
          flex items-center justify-center
          text-white
        "
        >
          <FontAwesomeIcon icon={faTimes} className="text-lg" />
        </button>
      </div>
    </div>
  );
};

export default DismissibleBottomBanner;
