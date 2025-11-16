// src/components/MarkerPopupContent.tsx
import React from "react";

type Props = {
  name: string;
  categoryLabel: string;
  subtypeLabel: string;
  x: number;
  y: number;
  description: string;
};

const MarkerPopupContent: React.FC<Props> = ({
                                               name,
                                               categoryLabel,
                                               subtypeLabel,
                                               x,
                                               y,
                                               description,
                                             }) => {
  return (
    <div className="min-w-[260px] max-w-[360px] space-y-2 text-xs leading-snug">
      {/* Title */}
      <h3 className="text-sm font-semibold">{name}</h3>

      {/* Category / subtype + coordinates */}
      <p className="text-[11px] text-default-500">
        {categoryLabel} / {subtypeLabel}{" "}
        <span className="opacity-80">
          ({x.toFixed(0)}, {y.toFixed(0)})
        </span>
      </p>

      {/* Description */}
      <div className="pt-1 border-t border-default-200">
        <p className="text-[11px] text-default-600">{description}</p>
      </div>
    </div>
  );
};

export default MarkerPopupContent;
