// src/components/DismissibleEmblaBanner.tsx
import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import type { EmblaOptionsType } from "embla-carousel";
import EmblaCarouselBanner, {
  type BannerSlide,
} from "@/components/EmblaCarousel/EmblaCarouselBanner.tsx";

export type BannerPosition =
  | "bottom-center"
  | "middle-center"
  | "bottom-left"
  | "bottom-right"
  | "middle-left"
  | "middle-right";

export type CloseButtonPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type Props = {
  slides: BannerSlide[];
  width?: number;
  height?: number;
  position?: BannerPosition;
  offsetY?: number;
  emblaOptions?: EmblaOptionsType;
  closeButtonPosition?: CloseButtonPosition; // ✅ NEW
};

function getPositionClasses(position: BannerPosition) {
  switch (position) {
    case "bottom-center":
      return "fixed left-1/2 bottom-6 -translate-x-1/2";
    case "middle-center":
      return "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
    case "bottom-left":
      return "fixed left-6 bottom-6";
    case "bottom-right":
      return "fixed right-6 bottom-6";
    case "middle-left":
      return "fixed left-6 top-1/2 -translate-y-1/2";
    case "middle-right":
      return "fixed right-6 top-1/2 -translate-y-1/2";
    default:
      return "";
  }
}

function getCloseButtonClasses(pos: CloseButtonPosition) {
  switch (pos) {
    case "top-right":
      return "top-2 right-2";
    case "bottom-left":
      return "bottom-2 left-2";
    case "bottom-right":
      return "bottom-2 right-2";
    case "top-left":
    default:
      return "top-2 left-2";
  }
}

const DismissibleEmblaBanner: React.FC<Props> = ({
                                                   slides,
                                                   width = 280,
                                                   height = 260,
                                                   position = "bottom-center",
                                                   offsetY,
                                                   emblaOptions,
                                                   closeButtonPosition = "top-left", // ✅ default
                                                 }) => {
  const [visible, setVisible] = useState(true);

  const positionClass = useMemo(
    () => getPositionClasses(position),
    [position],
  );

  const closeBtnClass = useMemo(
    () => getCloseButtonClasses(closeButtonPosition),
    [closeButtonPosition],
  );

  if (!visible) return null;

  return (
    <div
      className={`
        ${positionClass}
        z-[30000]
        rounded-lg
        overflow-hidden
        bg-transparent
      `}
      style={{
        width,
        height,
        marginTop: offsetY,
      }}
      datatype="advertisement"
    >
      <EmblaCarouselBanner
        slides={slides}
        options={emblaOptions}
        className="w-full h-full"
        viewportClassName="w-full h-full"
        containerClassName="h-full"
      />

      {/* Close button */}
      <button
        type="button"
        onClick={() => setVisible(false)}
        className={`
          absolute ${closeBtnClass}
          w-8 h-8
          rounded-md
          bg-black/40 hover:bg-black/60
          flex items-center justify-center
          text-white
        `}
        aria-label="Close banner"
      >
        <FontAwesomeIcon icon={faTimes} className="text-lg" />
      </button>
    </div>
  );
};

export default DismissibleEmblaBanner;
