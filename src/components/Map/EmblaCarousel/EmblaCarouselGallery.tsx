// src/components/EmblaCarousel/EmblaCarouselGallery.tsx
import "./EmblaCarousel.css";

import React, { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType, EmblaCarouselType } from "embla-carousel";

import { DotButton } from "./EmblaCarouselDotButton";
import {
  PrevButton,
  NextButton,
  usePrevNextButtons,
} from "./EmblaCarouselArrowButtons";

type Props = {
  images: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  options?: EmblaOptionsType;
  className?: string;
};

const EmblaCarouselGallery: React.FC<Props> = ({
                                                 images,
                                                 selectedIndex,
                                                 onSelect,
                                                 options,
                                                 className = "",
                                               }) => {
  const [viewportRef, emblaApi] = useEmblaCarousel({
    loop: true,
    ...options,
  });

  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const hasMultiple = images.length > 1;

  const {
    prevBtnDisabled,
    nextBtnDisabled,
    onPrevButtonClick,
    onNextButtonClick,
  } = usePrevNextButtons(emblaApi);

  // Handle init / scroll events
  useEffect(() => {
    if (!emblaApi) return;

    const handleSelect = (api: EmblaCarouselType) => {
      onSelect(api.selectedScrollSnap());
    };

    const handleReInit = (api: EmblaCarouselType) => {
      setScrollSnaps(api.scrollSnapList());
      handleSelect(api);
    };

    // 🔹 Set scrollSnaps immediately on first mount
    setScrollSnaps(emblaApi.scrollSnapList());
    handleSelect(emblaApi);

    emblaApi.on("select", handleSelect);
    emblaApi.on("reInit", handleReInit);

    return () => {
      emblaApi.off("select", handleSelect);
      emblaApi.off("reInit", handleReInit);
    };
  }, [emblaApi, onSelect]);

  // Sync when parent changes selectedIndex
  useEffect(() => {
    if (emblaApi) emblaApi.scrollTo(selectedIndex, false);
  }, [emblaApi, selectedIndex]);

  const handleDotClick = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  return (
    <div className="embla-frame-wrapper">
      {/* Arrows OUTSIDE the image frame, inside modal */}
      {hasMultiple && (
        <PrevButton
          className="embla-nav-button__prev"
          onClick={onPrevButtonClick}
          disabled={prevBtnDisabled}
        />
      )}

      <section className={["embla embla--gallery", className].join(" ")}>
        {/* Image viewport */}
        <div className="embla__viewport" ref={viewportRef}>
          <div className="embla__container">
            {images.map((src, index) => (
              <div className="embla__slide" key={index}>
                <div className="embla__slide__inner">
                  <img src={src} alt="" className="embla__slide__img" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots inside image, slightly lifted */}
        {hasMultiple && (
          <div className="embla__dots">
            {scrollSnaps.map((_, index) => (
              <DotButton
                key={index}
                onClick={() => handleDotClick(index)}
                selected={index === selectedIndex}
              />
            ))}
          </div>
        )}
      </section>

      {hasMultiple && (
        <NextButton
          className="embla-nav-button__next"
          onClick={onNextButtonClick}
          disabled={nextBtnDisabled}
        />
      )}
    </div>
  );
};

export default EmblaCarouselGallery;
