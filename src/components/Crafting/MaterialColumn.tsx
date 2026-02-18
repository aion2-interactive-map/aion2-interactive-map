import React from "react";
import { useTranslation } from "react-i18next";
import { getStaticUrl } from "@/utils/url.ts";
import type { MaterialRow } from "@/types/crafting.ts";
import type { GradeMeta as Grade, ItemMeta as Item } from "@/types/game.ts";
import { MaterialCard } from "./MaterialCard.tsx";
import { MaterialSum } from "./MaterialSum.tsx";

export type MaterialColumnProps = {
  typeName: string;
  rows: MaterialRow[];
  itemsById: Map<number, Item>;
  gradesByName: Map<string, Grade>;
  priceByMaterialId: Record<number, string>;
  ownedByMaterialId: Record<number, string>;
  onPriceChange: (id: number, val: string) => void;
  onOwnedChange: (id: number, val: number) => void;
  onIncOwned: (row: MaterialRow) => void;
  onDecOwned: (row: MaterialRow) => void;
  sum: number;
  sumLabel: string;
};

export const MaterialColumn: React.FC<MaterialColumnProps> = ({
  typeName,
  rows,
  itemsById,
  gradesByName,
  priceByMaterialId,
  ownedByMaterialId,
  onPriceChange,
  onOwnedChange,
  onIncOwned,
  onDecOwned,
  sum,
  sumLabel,
}) => {
  const { t } = useTranslation();

  function getOwnedX(materialId: number): number {
    const raw = ownedByMaterialId[materialId];
    if (raw == null || raw === "") return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-crafting-border bg-transparent">
      {/* Header */}
      <div className="m-2 flex h-[38px] items-center justify-center border-b border-crafting-border px-3 py-2">
        <div className="text-base font-bold leading-[16px] text-default-900">
          {typeName}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3">
        <div className="flex flex-col gap-2">
          {rows.length === 0 ? (
            <div className="text-xs text-default-500">No materials</div>
          ) : (
            rows.map((row) => {
              const item = itemsById.get(row.id);
              const name = t(`items/items:${row.id}.name`, String(row.id));
              const icon = item?.icon ? getStaticUrl(item.icon) : "";
              const unitPriceStr = priceByMaterialId[row.id] ?? "";
              const grade = gradesByName.get(item?.grade || "");
              const x = getOwnedX(row.id);

              return (
                <MaterialCard
                  key={row.id}
                  row={row}
                  item={item}
                  name={name}
                  icon={icon}
                  unitPriceStr={unitPriceStr}
                  gradeName={grade?.name || ""}
                  ownedCount={x}
                  onPriceChange={onPriceChange}
                  onOwnedChange={onOwnedChange}
                  onIncOwned={onIncOwned}
                  onDecOwned={onDecOwned}
                  priceByMaterialId={priceByMaterialId}
                  ownedByMaterialId={ownedByMaterialId}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Column sum */}
      <div className="m-2">
        <MaterialSum label={sumLabel} value={sum} />
      </div>
    </div>
  );
};
