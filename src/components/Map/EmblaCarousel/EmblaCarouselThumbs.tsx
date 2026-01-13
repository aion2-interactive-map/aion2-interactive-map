// src/components/EmblaCarouselThumbs.tsx
import "./EmblaCarousel.css";

import React, { useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";

type Props = {
  images: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  options?: EmblaOptionsType;
  className?: string;
};

const EmblaCarouselThumbs: React.FC<Props> = ({
                                                images,
                                                selectedIndex,
                                                onSelect,
                                                options,
                                                className = "",
                                              }) => {
  const [viewportRef, emblaApi] = useEmblaCarousel({
    dragFree: true,
    containScroll: "trimSnaps",
    slidesToScroll: "auto",
    ...options,
  });

  // Scroll to selected thumb when it changes
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.scrollTo(selectedIndex, true);
  }, [emblaApi, selectedIndex]);

  return (
    <section className={["embla-thumbs", className].join(" ")}>
      <div className="embla-thumbs__viewport" ref={viewportRef}>
        <div className="embla-thumbs__container">
          {images.map((src, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={index}
                type="button"
                className={[
                  "embla-thumbs__slide",
                  isSelected ? "embla-thumbs__slide--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelect(index)}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="embla-thumbs__img"
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EmblaCarouselThumbs;
