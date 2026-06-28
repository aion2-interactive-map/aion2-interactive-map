import React, {useState, useEffect} from "react";
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
  nextBannerImageUrl?: string;
  nextBannerPosition?: BannerPosition;  // new prop to handle next banner position
  nextBannerDelay?: number;  // new prop to delay next banner (in ms)
  nextBannerHeight?: number;
  nextBannerWidth?: number;
};

const DismissibleBanner: React.FC<Props> = ({
                                              href,
                                              imageUrl,
                                              width = 800,
                                              height = 120,
                                              position = "bottom-center",
                                              offsetY,
                                              nextBannerImageUrl,
                                              nextBannerPosition,
                                              nextBannerDelay = 2000,  // Default delay of 2 seconds before next banner appears
                                              nextBannerHeight,
                                              nextBannerWidth,
                                            }) => {
  const [visible, setVisible] = useState(true);
  const [nextVisible, setNextVisible] = useState(false);

  useEffect(() => {
    if (!visible && nextBannerPosition) {
      // After the current banner is closed, show the next banner after a delay
      const timer = setTimeout(() => setNextVisible(true), nextBannerDelay);
      return () => clearTimeout(timer);
    }
  }, [visible, nextBannerPosition, nextBannerDelay]);

  if (!visible && !nextVisible) return null;

  const getPositionClasses = (bannerPosition: BannerPosition) => {
    switch (bannerPosition) {
      case "bottom-center":
        return {positionClasses: "fixed left-1/2 bottom-6", translateX: "-translate-x-1/2"};
      case "middle-center":
        return {
          positionClasses: "fixed left-1/2 top-1/2",
          translateX: "-translate-x-1/2",
          translateY: "-translate-y-1/2"
        };
      case "bottom-left":
        return {positionClasses: "fixed left-6 bottom-6"};
      case "bottom-right":
        return {positionClasses: "absolute right-6 bottom-6"};
      case "middle-left":
        return {positionClasses: "fixed left-6 top-1/2", translateY: "-translate-y-1/2"};
      case "middle-right":
        return {positionClasses: "fixed right-6 top-1/2", translateY: "-translate-y-1/2"};
      default:
        return {positionClasses: "", translateX: "", translateY: ""};
    }
  };

  const {
    positionClasses: currentPositionClasses,
    translateX: currentTranslateX,
    translateY: currentTranslateY
  } = getPositionClasses(position);
  const {
    positionClasses: nextPositionClasses,
    translateX: nextTranslateX,
    translateY: nextTranslateY
  } = nextBannerPosition
    ? getPositionClasses(nextBannerPosition)
    : {positionClasses: "", translateX: "", translateY: ""};

  // offset override
  const extraOffsetStyle: React.CSSProperties = {};
  if (offsetY !== undefined) {
    extraOffsetStyle.marginTop = offsetY;
  }

  // --------------------------------------------------------------------------

  return (
    <>
      {/* Current Banner */}
      {visible && (
        <div
          className={`
            ${currentPositionClasses}
            ${currentTranslateX} ${currentTranslateY}
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
              className="w-full h-full mx-auto object-contain"
            />
          </a>
          {/* Close button */}
          <button
            onClick={() => setVisible(false)}
            className="absolute top-2 left-2 w-8 h-8 rounded-md bg-black/40 hover:bg-black/60 flex items-center justify-center text-white"
          >
            <FontAwesomeIcon icon={faTimes} className="text-lg"/>
          </button>
        </div>
      )}

      {/* Next Banner */}
      {nextVisible && (
        <div
          className={`
            ${nextPositionClasses}
            ${nextTranslateX} ${nextTranslateY}
            z-[30000] shadow-xl rounded-lg overflow-hidden
          `}
          style={{
            ...extraOffsetStyle,
            width: nextBannerWidth || width,
            height: nextBannerHeight || height,
          }}
          datatype="advertisement"
        >
          <a href={href} target="_blank">
            <img
              src={nextBannerImageUrl || imageUrl}
              alt=""
              className="w-full h-full mx-auto object-contain"
            />
          </a>
          {/* Close button */}
          <button
            onClick={() => setNextVisible(false)}
            className="absolute top-2 left-2 w-8 h-8 rounded-md bg-black/40 hover:bg-black/60 flex items-center justify-center text-white"
          >
            <FontAwesomeIcon icon={faTimes} className="text-lg"/>
          </button>
        </div>
      )}
    </>
  );
};

export default DismissibleBanner;
