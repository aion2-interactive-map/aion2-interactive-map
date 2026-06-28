import React from "react";
import { NumberInput } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight, faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import { getStaticUrl } from "@/utils/url.ts";
import type { MaterialRow } from "@/types/crafting.ts";
import type { ItemMeta as Item } from "@/types/game.ts";
import { useItemData } from "@/context/ItemDataContext.tsx";

export type MaterialCardProps = {
  row: MaterialRow;
  item?: Item;
  name: string;
  icon: string;
  unitPriceStr: string;
  gradeName: string;
  ownedCount: number;
  onPriceChange: (id: number, val: string) => void;
  onOwnedChange: (id: number, val: number) => void;
  onIncOwned: (row: MaterialRow) => void;
  onDecOwned: (row: MaterialRow) => void;
  priceByMaterialId: Record<number, string>;
  ownedByMaterialId: Record<number, string>;
  depth?: number;
};

function toNonNegativeInt(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

export const MaterialCard: React.FC<MaterialCardProps> = ({
  row,
  name,
  icon,
  unitPriceStr,
  gradeName,
  ownedCount,
  onPriceChange,
  onOwnedChange,
  onIncOwned,
  onDecOwned,
  priceByMaterialId,
  ownedByMaterialId,
  depth = 0,
}) => {
  const { t } = useTranslation();
  const { itemsById, gradesByName } = useItemData();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const gradeBackground = getStaticUrl(
    `UI/Resource/Texture/ETC/UT_SlotGrade_${gradeName}.webp`,
  );

  function getOwnedX(materialId: number): number {
    const raw = ownedByMaterialId[materialId];
    if (raw == null || raw === "") return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  const hasChildren = !!row.children && row.children.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div 
        className={`flex flex-col gap-2 rounded-lg border border-default-200 bg-crafting-item p-2 ${depth > 0 ? "ml-4" : ""}`}
      >
        <div className="flex items-center gap-1 min-w-0">
          {hasChildren && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex h-4 w-4 items-center justify-center text-default-500 hover:text-default-800"
            >
              <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} className="text-[10px]" />
            </button>
          )}
          <div className="truncate text-sm font-semibold text-default-900">
            {name}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="flex h-12 w-12 items-center justify-center rounded-sm bg-contain bg-center bg-no-repeat shrink-0"
            style={{ backgroundImage: `url(${gradeBackground})` }}
          >
            {icon ? (
              <img src={icon} alt={name} className="h-12 w-12 object-contain" />
            ) : (
              <div className="text-xs text-default-500">{row.id}</div>
            )}
          </div>

          {/* Right side */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {/* - X/N + */}
            <div className="flex items-center gap-2">
              <div
                role="button"
                tabIndex={0}
                className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-primary dark:bg-secondary hover:opacity-80"
                onClick={() => onDecOwned(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onDecOwned(row);
                }}
                title="-"
              >
                <FontAwesomeIcon icon={faMinus} className="text-[10px] text-white" />
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="inline-flex align-middle -translate-y-[1px]"
                  style={{ width: `${Math.max(3, String(ownedCount).length)}ch` }}
                >
                  <NumberInput
                    size="sm"
                    hideStepper
                    value={ownedCount}
                    onValueChange={(v) => onOwnedChange(row.id, toNonNegativeInt(v ?? 0))}
                    radius="none"
                    classNames={{
                      base: "w-full",
                      inputWrapper:
                        "w-full bg-transparent border-0 shadow-none px-0 h-[20px] min-h-[20px] " +
                        "group-data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent " +
                        "focus-within:shadow-none",
                      input:
                        "w-full h-[20px] text-[14px] leading-[20px] text-center p-0 text-default-900 bg-transparent",
                    }}
                  />
                </span>
                <div className="text-sm font-semibold text-default-900">
                  / {row.count}
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-primary dark:bg-secondary hover:opacity-80"
                onClick={() => onIncOwned(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onIncOwned(row);
                }}
                title="+"
              >
                <FontAwesomeIcon icon={faPlus} className="text-[10px] text-white" />
              </div>
            </div>

            {/* Unit price */}
            <NumberInput
              size="sm"
              placeholder={t("common:crafting.unitPrice", "Unit price")}
              value={unitPriceStr === "" ? undefined : Number(unitPriceStr)}
              onValueChange={(v) => onPriceChange(row.id, v == null ? "" : String(v))}
              radius="sm"
              hideStepper
              classNames={{
                base: "w-full",
                inputWrapper:
                  "group-data-[hover=true]:!bg-search-item " +
                  "group-data-[focus=true]:!bg-search-item " +
                  "group-data-[focus-visible=true]:!bg-search-item " +
                  "group-data-[invalid=true]:!bg-search-item " +
                  "h-[28px] min-h-[28px] px-2 border border-crafting-border " +
                  "shadow-none focus-within:shadow-none",
                input: "h-[28px] text-[14px] leading-[28px]",
              }}
            />
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col gap-2 mt-1">
          {row.children!.map((child) => {
            const childItem = itemsById.get(child.id);
            const childName = t(`items/items:${child.id}.name`, String(child.id));
            const childIcon = childItem?.icon ? getStaticUrl(childItem.icon) : "";
            const childUnitPriceStr = priceByMaterialId[child.id] ?? "";
            const childGrade = gradesByName.get(childItem?.grade || "");
            const childX = getOwnedX(child.id);

            return (
              <MaterialCard
                key={child.id}
                row={child}
                item={childItem}
                name={childName}
                icon={childIcon}
                unitPriceStr={childUnitPriceStr}
                gradeName={childGrade?.name || ""}
                ownedCount={childX}
                onPriceChange={onPriceChange}
                onOwnedChange={onOwnedChange}
                onIncOwned={onIncOwned}
                onDecOwned={onDecOwned}
                priceByMaterialId={priceByMaterialId}
                ownedByMaterialId={ownedByMaterialId}
                depth={depth + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
