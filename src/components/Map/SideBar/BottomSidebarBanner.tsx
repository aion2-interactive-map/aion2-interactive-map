import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

type CloseButtonPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type BottomSidebarBannerProps = {
  imageUrl: string;
  imageUrl2?: string;
  height: number;  // Banner height
  href: string;
  href2?: string;
  autoCloseDelay?: number;  // Delay before showing the close button (in ms)
  closeButtonPosition?: CloseButtonPosition;  // Position of the close button
  onClose?: () => void;
};

const BottomSidebarBanner: React.FC<BottomSidebarBannerProps> = ({
                                                                   imageUrl,
                                                                   imageUrl2,
                                                                   height,
                                                                   href,
                                                                   href2,
                                                                   onClose,
                                                                   autoCloseDelay = 10000,  // Default 5 seconds before showing the close button
                                                                   closeButtonPosition = "top-right",  // Default position of the close button
                                                                 }) => {
  const [visible, setVisible] = useState(true);
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    if (autoCloseDelay) {
      const timer = setTimeout(() => setShowCloseButton(true), autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoCloseDelay]);

  if (!visible) return null;

  // Close button positioning logic
  let closeButtonClasses = "";
  switch (closeButtonPosition) {
    case "top-left":
      closeButtonClasses = "top-2 left-7";
      break;
    case "top-right":
      closeButtonClasses = "top-2 right-7";
      break;
    case "bottom-left":
      closeButtonClasses = "bottom-2 left-7";
      break;
    case "bottom-right":
      closeButtonClasses = "bottom-2 right-7";
      break;
  }

  return (
    <div
      className="absolute bottom-4 mx-auto w-full flex items-center justify-center text-center flex-col"
      style={{ height }}
      datatype="advertisement"
    >
      <div>
      <a href={href} target="_blank">
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full mx-auto object-contain"
        />
      </a>
      </div>
      {imageUrl2 && (
        <div>
        <a href={href2} target="_blank" className="mt-2">
          <img
            src={imageUrl2}
            alt=""
            className="w-full h-full mx-auto object-contain"
          />
        </a>
        </div>
      )}

      {/* Close button (only shows after the delay) */}
      {showCloseButton && (
        <button
          onClick={() => {
            if (onClose) onClose();
            setVisible(false);
          }}
          className={`absolute ${closeButtonClasses} w-8 h-8 rounded-md bg-black/40 hover:bg-black/60 flex items-center justify-center text-white`}
        >
          <FontAwesomeIcon icon={faTimes} className="text-lg" />
        </button>
      )}
    </div>
  );
};

export default BottomSidebarBanner;
