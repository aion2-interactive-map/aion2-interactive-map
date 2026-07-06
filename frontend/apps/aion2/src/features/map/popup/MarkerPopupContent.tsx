import React from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

import type { MarkerWithTranslations } from "@/types/game";
import { useGameMap } from "@/context/GameMapContext";
import { useMarkers } from "@/context/MarkersContext";
import { Card, CardContent, cn } from "@gamemap/ui";
import { getStaticUrl } from "@/lib/url";

type Props = {
  marker: MarkerWithTranslations;
};

function resolveImage(src: string): string {
  return src.startsWith("http") ? src : getStaticUrl(src);
}

const MarkerPopupContent: React.FC<Props> = ({ marker }) => {
  const { types } = useGameMap();
  const { completedBySubtype, toggleMarkerCompleted } = useMarkers();
  const { t } = useTranslation(["common", "types", "wiki"]);

  // Locate subtype meta across categories.
  const sub = types
    .flatMap((c) => c.subtypes)
    .find((s) => s.name === marker.subtype);

  const name =
    marker.localizedName || t("common:markerSearch.unnamed", "Unnamed");
  const description = marker.localizedDescription || "";

  // "Category / Subtype (x, y)" — e.g. "Location / Teleport (4708, 3924)".
  const categoryId = sub?.category ?? marker.category;
  const categoryLabel = categoryId
    ? t(`types:categories.${categoryId}.name`, categoryId)
    : "";
  const subtypeLabel = t(`types:subtypes.${marker.subtype}.name`, marker.subtype);
  const coords = `(${Math.round(marker.x)}, ${Math.round(marker.y)})`;
  // Fragment kind (ground/air/water) appended after the subtype, e.g.
  // "Collection / Monolith · Air".
  const fragmentTypeLabel = marker.fragmentType
    ? t(`common:fragmentType.${marker.fragmentType}`)
    : "";
  const metaLine = [
    [categoryLabel, subtypeLabel].filter(Boolean).join(" / "),
    fragmentTypeLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  const canComplete = sub?.canComplete !== false;
  const isCompleted =
    completedBySubtype[marker.subtype]?.has(marker.indexInSubtype) ?? false;

  return (
    <Card
      data-testid="marker-popup-card"
      // `gm-popup-card` is the engine.css hook that draws the popup's downward
      // pointer triangle and suppresses the border seam (see engine.css).
      className="gm-popup-card w-[320px] gap-0 py-0 rounded-[10px] border-border bg-card text-card-foreground shadow-lg"
    >
      <CardContent className="flex flex-col px-4 py-4">
        {/* Title */}
        <div className="text-[18px] font-bold leading-snug text-[#3D3D3D] dark:text-white">
          {name}
        </div>

        {/* Category / subtype + coords */}
        <div className="mt-2 text-[14px] leading-tight text-[rgba(0,0,0,0.6)] dark:text-[rgba(255,255,255,0.6)]">
          {metaLine}
          {metaLine ? " " : ""}
          <span className="tabular-nums">{coords}</span>
        </div>
        {marker.entity && (
          <Link
            to="/wiki/$type/$slug"
            params={{
              type: marker.entity.type,
              slug: String(marker.entity.id),
            }}
            className="mt-1 inline-block text-sm text-primary hover:underline"
            data-testid="popup-wiki-link"
          >
            {t("wiki:nav.wiki")} -&gt;
          </Link>
        )}

        {/* Description (with dividers above/below); grey placeholder if none */}
        <hr className="my-3 border-0 border-t border-border" />
        {description ? (
          <div className="text-[14px] leading-relaxed text-[#3D3D3D] dark:text-white">
            {description}
          </div>
        ) : (
          <div className="text-[14px] leading-relaxed text-[rgba(0,0,0,0.35)] italic dark:text-[rgba(255,255,255,0.35)]">
            {t("common:ui.noDescription", "No description")}
          </div>
        )}

        {/* Image grid */}
        {marker.images?.length ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {marker.images.map((src, i) => (
              <img
                key={`${src}-${i}`}
                src={resolveImage(src)}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-md object-cover"
              />
            ))}
          </div>
        ) : null}

        {/* Footer — completion pill */}
        {canComplete && (
          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={() => toggleMarkerCompleted(marker)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors",
                isCompleted
                  ? "bg-[rgba(85,179,76,0.12)] text-[#55B34C]"
                  : "border border-[#55B34C] text-[#55B34C] hover:bg-[rgba(85,179,76,0.08)]",
              )}
              aria-pressed={isCompleted}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              {isCompleted
                ? t("common:markerActions.markNotCompleted", "Completed")
                : t("common:markerActions.markCompleted", "Mark as completed")}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarkerPopupContent;
