// src/components/EmblaCarouselDotButton.tsx
import React from "react";

export type DotButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export const DotButton: React.FC<DotButtonProps> = ({
                                                      selected = false,
                                                      className = "",
                                                      ...rest
                                                    }) => {
  return (
    <button
      type="button"
      className={[
        "embla__dot",
        selected ? "embla__dot--selected" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
};