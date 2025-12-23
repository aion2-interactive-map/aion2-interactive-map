// src/components/EmblaCarousel/EmblaCarouselBanner.tsx
import React, { useCallback, useMemo } from "react";
import type { EmblaOptionsType, EmblaCarouselType } from "embla-carousel";
import { DotButton, useDotButton } from "./EmblaCarouselDotButtonBanner";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";

export type BannerSlide = {
  image: string;
  url?: string;
  alt?: string;
  target?: "_blank" | "_self";
};

type PropType = {
  slides: BannerSlide[];
  options?: EmblaOptionsType;
  className?: string; // outer <section>
  viewportClassName?: string;
  containerClassName?: string;

  autoplayDelayMs?: number; // ✅ NEW (optional)
  randomStart?: boolean;    // ✅ NEW (optional)
};

const EmblaCarouselBanner: React.FC<PropType> = ({
                                                   slides,
                                                   options,
                                                   className,
                                                   viewportClassName,
                                                   containerClassName,
                                                   autoplayDelayMs = 4000, // ✅ default interval
                                                   randomStart = true,     // ✅ default enabled
                                                 }) => {
  // ✅ Pick a random start index once per mount (not per render)
  const startIndex = useMemo(() => {
    if (!randomStart) return options?.startIndex ?? 0;
    if (!slides.length) return 0;
    return Math.floor(Math.random() * slides.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty: randomize only once on mount

  // ✅ Merge user options, but ensure startIndex is set
  const mergedOptions = useMemo<EmblaOptionsType>(() => {
    return { ...(options ?? {}), startIndex };
  }, [options, startIndex]);

  const [emblaRef, emblaApi] = useEmblaCarousel(mergedOptions, [
    Autoplay({ delay: autoplayDelayMs }), // ✅ interval
  ]);

  const onNavButtonClick = useCallback((api: EmblaCarouselType) => {
    const autoplay = api?.plugins()?.autoplay;
    if (!autoplay) return;

    const resetOrStop =
      autoplay.options.stopOnInteraction === false ? autoplay.reset : autoplay.stop;

    resetOrStop();
  }, []);

  const { selectedIndex, scrollSnaps, onDotButtonClick } = useDotButton(
    emblaApi,
    onNavButtonClick
  );

  return (
    <section className={["embla", className].filter(Boolean).join(" ")}>
      <div
        className={["embla__viewport", viewportClassName].filter(Boolean).join(" ")}
        ref={emblaRef}
      >
        <div
          className={["embla__container", containerClassName].filter(Boolean).join(" ")}
        >
          {slides.map((banner, index) => {
            const content = (
              <img
                src={banner.image}
                alt={banner.alt ?? ""}
                className="w-full h-full object-contain select-none pointer-events-none"
                draggable={false}
              />
            );

            return (
              <div className="embla__slide" key={index}>
                <div className="w-full h-full">
                  {banner.url ? (
                    <a
                      href={banner.url}
                      target={banner.target ?? "_blank"}
                      rel={banner.target === "_blank" ? "noreferrer" : undefined}
                      className="block w-full h-full"
                      datatype="advertisement"
                    >
                      {content}
                    </a>
                  ) : (
                    content
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {scrollSnaps.length > 1 && (
        <div className="embla__controls">
          <div className="embla__dots">
            {scrollSnaps.map((_, index) => (
              <DotButton
                key={index}
                onClick={() => onDotButtonClick(index)}
                className={"embla__dot".concat(
                  index === selectedIndex ? " embla__dot--selected" : ""
                )}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default EmblaCarouselBanner;
