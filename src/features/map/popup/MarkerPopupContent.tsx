import React from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";

import type { MarkerWithTranslations } from "@/types/game";
import { useGameMap } from "@/context/GameMapContext";
import { useMarkers } from "@/context/MarkersContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseIconUrl, getStaticUrl } from "@/lib/url";

type Props = {
  marker: MarkerWithTranslations;
};

function resolveImage(src: string): string {
  return src.startsWith("http") ? src : getStaticUrl(src);
}

const MarkerPopupContent: React.FC<Props> = ({ marker }) => {
  const { selectedMap, types } = useGameMap();
  const { completedBySubtype, toggleMarkerCompleted } = useMarkers();
  const { t } = useTranslation();

  // Locate subtype meta across categories.
  const sub = types
    .flatMap((c) => c.subtypes)
    .find((s) => s.name === marker.subtype);

  const subtypeLabel = t(`types:subtypes.${marker.subtype}.name`, marker.subtype);
  const name =
    marker.localizedName ||
    t("common:markerSearch.unnamed", "Unnamed");
  const description = marker.localizedDescription || "";

  const subtypeIcon = selectedMap
    ? parseIconUrl(marker.icon || sub?.icon || "", selectedMap)
    : null;

  const canComplete = sub?.canComplete !== false;
  const isCompleted =
    completedBySubtype[marker.subtype]?.has(marker.indexInSubtype) ?? false;

  const coordsText = `${Math.round(marker.x)}, ${Math.round(marker.y)}`;
  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(coordsText).catch((err) => {
        console.error("Clipboard error", err);
      });
    }
  };

  return (
    <Card
      data-testid="marker-popup-card"
      className="max-w-xs gap-3 py-3 bg-card text-card-foreground border-border"
    >
      <CardContent className="px-4 flex flex-col gap-3">
        {/* Title */}
        <div className="text-base font-semibold leading-tight">{name}</div>

        {/* Subtype label + icon */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {subtypeIcon && (
            <img
              src={subtypeIcon}
              alt=""
              className="h-4 w-4 object-contain"
              loading="lazy"
            />
          )}
          <span className="truncate">{subtypeLabel}</span>
        </div>

        {/* Description */}
        {description && (
          <div className="text-sm leading-snug">{description}</div>
        )}

        {/* Coordinates */}
        <div className="flex items-center gap-2 text-sm">
          <span className="tabular-nums">{coordsText}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
            aria-label="Copy coordinates"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Completion */}
        {canComplete && (
          <Button
            type="button"
            variant={isCompleted ? "secondary" : "default"}
            size="sm"
            className="w-full"
            onClick={() => toggleMarkerCompleted(marker)}
          >
            {isCompleted && <Check className="h-4 w-4" />}
            {isCompleted
              ? t("common:markerActions.markNotCompleted", "Completed")
              : t("common:markerActions.markCompleted", "Mark as completed")}
          </Button>
        )}

        {/* Images */}
        {marker.images?.length ? (
          <div className="grid grid-cols-2 gap-2">
            {marker.images.map((src, i) => (
              <img
                key={`${src}-${i}`}
                src={resolveImage(src)}
                alt=""
                loading="lazy"
                className="w-full h-auto rounded-md object-cover"
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default MarkerPopupContent;
