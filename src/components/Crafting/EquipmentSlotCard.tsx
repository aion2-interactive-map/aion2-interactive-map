import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import { getStaticUrl } from "@/utils/url.ts";
import type { EquipmentSlot, ItemMeta as Item } from "@/types/game.ts";

export type EquipmentSlotCardProps = {
  slot: EquipmentSlot;
  selectedItem?: Item;
  count: number;
  mode: "thumbnail" | "weapon_armor" | "accessory";
  gradeName: string;
  onSlotClick: () => void;
  onBumpCount: (delta: number) => void;
};

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    if (v && v.trim().length > 0) return v;
  }
  return "";
}

export const EquipmentSlotCard: React.FC<EquipmentSlotCardProps> = ({
  slot,
  selectedItem,
  count,
  mode,
  gradeName,
  onSlotClick,
  onBumpCount,
}) => {
  const { t } = useTranslation();

  const selectedId = selectedItem?.id;
  const imgSrc = getStaticUrl(firstNonEmpty(selectedItem?.icon, slot.icon));
  const slotName = t(`items/types:subtypes.${slot.name}.name`, slot.name);
  const itemName = selectedItem
    ? t(`items/items:${selectedItem.id}.name`, String(selectedItem.id))
    : slotName;

  const CountBar = (
    <div className="pointer-events-none flex items-center justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-sm bg-black/40 px-1">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBumpCount(-1);
          }}
          disabled={!selectedId || count <= 0}
          className={[
            "flex h-4 w-4 items-center justify-center rounded-sm",
            !selectedId || count <= 0 ? "opacity-40" : "hover:bg-black/30",
          ].join(" ")}
          title={t("common:crafting.minus", "Minus")}
        >
          <FontAwesomeIcon icon={faMinus} className="text-[10px] text-white" />
        </button>

        <div className="min-w-[18px] text-center text-xs font-bold leading-[12px] text-white">
          {selectedId ? String(Math.max(0, count)) : "0"}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBumpCount(1);
          }}
          disabled={!selectedId}
          className={[
            "flex h-4 w-4 items-center justify-center rounded-sm",
            !selectedId ? "opacity-40" : "hover:bg-black/30",
          ].join(" ")}
          title={t("common:crafting.plus", "Plus")}
        >
          <FontAwesomeIcon icon={faPlus} className="text-[10px] text-white" />
        </button>
      </div>
    </div>
  );

  if (mode === "thumbnail") {
    const gradeBackground = getStaticUrl(
      `UI/Resource/Texture/ETC/UT_SlotGrade_${gradeName}.webp`,
    );

    return (
      <button
        type="button"
        onClick={onSlotClick}
        className="relative h-12 w-[89px] rounded-sm bg-contain bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${gradeBackground})`,
          backgroundSize: "100% 100%",
        }}
        title={slotName}
      >
        <div
          className={`flex h-full w-full items-center justify-center rounded-sm ${
            selectedId ? "" : "bg-[#0D0E15]"
          }`}
        >
          <img src={imgSrc} alt={slot.name} className="h-full w-full object-contain" />
        </div>

        {/* Top: slot name */}
        <div className="pointer-events-none absolute inset-x-1 top-[2px] z-20">
          <div className="truncate text-center text-xs font-bold leading-[12px] text-white [text-shadow:0px_2px_4px_rgba(0,0,0,0.35)]">
            {slotName}
          </div>
        </div>

        {/* Bottom: count + -/+ */}
        {selectedItem && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[2px] z-20 flex justify-center">
            {CountBar}
          </div>
        )}
      </button>
    );
  }

  // weapon_armor / accessory (list mode)
  const gradeBackground = getStaticUrl(
    `UI/Resource/Texture/ETC/UT_ItemTooltipGrade_${gradeName}.webp`,
  );

  return (
    <button
      type="button"
      onClick={onSlotClick}
      className="relative h-14 w-[188px] rounded-sm bg-contain bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${gradeBackground})`,
        backgroundSize: "100% 100%",
      }}
      title={itemName}
    >
      <div
        className={`flex h-full w-full items-center rounded-sm px-2 ${
          selectedId ? "" : "bg-[#0D0E15]"
        }`}
      >
        {/* Left: icon */}
        <img src={imgSrc} alt={slot.name} className="h-12 w-12 shrink-0 object-contain" />

        {/* Right: item name (top) + count (bottom) */}
        <div className="ml-2 flex h-12 min-w-0 flex-1 flex-col justify-center">
          <div className="truncate text-left text-[13px] font-bold leading-[13px] text-white [text-shadow:0px_2px_4px_rgba(0,0,0,0.35)]">
            {itemName}
          </div>
          {selectedItem && <div className="mt-1 flex items-center">{CountBar}</div>}
        </div>
      </div>
    </button>
  );
};
