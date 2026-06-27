import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { useGameMap } from "@/context/GameMapContext";
import { useGameData } from "@/context/GameDataContext";
import { useMarkers } from "@/context/MarkersContext";
import { cn } from "@/lib/utils";

/**
 * Category list: one block per marker category.
 * Each block: a header row (label + eye-toggle that shows/hides ALL subtypes
 * in the category) and a 2-column grid of count pills bound to visibleSubtypes.
 */
export default function MarkerTypes() {
  const { types } = useGameMap();
  const { visibleSubtypes, setVisibleSubtypes, handleToggleSubtype } =
    useGameData();
  const { subtypeCounts } = useMarkers();
  const { t } = useTranslation(["types", "common"]);

  const categories = useMemo(
    () => types.filter((c) => c.subtypes.length > 0),
    [types],
  );

  const setManySubtypes = (names: string[], visible: boolean) => {
    const next = new Set(visibleSubtypes);
    for (const n of names) {
      if (visible) next.add(n);
      else next.delete(n);
    }
    setVisibleSubtypes(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {categories.map((category) => {
        const subNames = category.subtypes.map((s) => s.name);
        const allVisible = subNames.every(
          (n) => visibleSubtypes?.has(n) ?? false,
        );
        return (
          <div key={category.name} className="flex flex-col gap-1.5">
            {/* Category header: label + eye toggle (all subtypes at once) */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#3D3D3D]">
                {t(`types:categories.${category.name}.name`, category.name)}
              </span>
              <button
                type="button"
                aria-label={
                  allVisible
                    ? t("common:menu.hideAllMarkers", "Hide all")
                    : t("common:menu.showAllMarkers", "Show all")
                }
                aria-pressed={allVisible}
                onClick={() => setManySubtypes(subNames, !allVisible)}
                className="flex size-5 items-center justify-center rounded text-[rgba(0,0,0,0.45)] transition-colors hover:text-[#2E97FF]"
              >
                {allVisible ? (
                  <Eye className="size-4" />
                ) : (
                  <EyeOff className="size-4" />
                )}
              </button>
            </div>

            {/* Subtype count pills (2-column grid) */}
            <div className="grid grid-cols-2 gap-1.5">
              {category.subtypes.map((sub) => {
                const total = subtypeCounts[sub.name] ?? 0;
                const checked = visibleSubtypes?.has(sub.name) ?? false;
                return (
                  <button
                    type="button"
                    key={sub.name}
                    data-testid={`subtype-toggle-${sub.name}`}
                    aria-pressed={checked}
                    onClick={() => handleToggleSubtype(sub.name)}
                    className={cn(
                      "flex h-8 items-center justify-between gap-1.5 rounded-md px-3 text-[13px] transition-colors",
                      checked
                        ? "bg-[#2E97FF] font-medium text-white"
                        : "bg-[#E5F0FF] text-[rgba(0,0,0,0.6)] hover:bg-[#d6e8ff]",
                    )}
                  >
                    <span className="truncate">
                      {t(`types:subtypes.${sub.name}.name`, sub.name)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-[13px] font-bold tabular-nums",
                        checked ? "text-white" : "text-[#2E97FF]",
                      )}
                    >
                      {total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
