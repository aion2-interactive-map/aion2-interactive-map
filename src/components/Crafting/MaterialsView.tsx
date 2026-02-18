import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useItemData } from "@/context/ItemDataContext";
import { faEquals, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { MaterialRow, SelectedBySlotKey } from "@/types/crafting.ts";
import { MaterialColumn } from "./MaterialColumn.tsx";
import { MaterialSum } from "./MaterialSum.tsx";

export type MaterialsViewProps = {
  selectedBySlotKey: SelectedBySlotKey;
};


function parseNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toNonNegativeInt(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

const STORAGE_MATERIAL_PRICES = "aion2.crafting.prices.v1";
const STORAGE_MATERIAL_OWNED = "aion2.crafting.materialOwned.v1";

const MATERIAL_TYPES = ["Equipment", "CraftResource", "GatherResource"] as const;
type MaterialType = (typeof MATERIAL_TYPES)[number];

function normalizeMaterialType(subtype: string | null | undefined): MaterialType {
  if (subtype === "CraftResource") return "CraftResource";
  if (subtype === "GatherResource") return "GatherResource";
  return "Equipment";
}

export function MaterialsView({ selectedBySlotKey }: MaterialsViewProps) {
  const { craftingById, itemsById, gradesByName } = useItemData();
  const { t } = useTranslation();

  // materialId -> unit price (string for typing)
  const [priceByMaterialId, setPriceByMaterialId] = useState<Record<number, string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_MATERIAL_PRICES);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_MATERIAL_PRICES, JSON.stringify(priceByMaterialId));
  }, [priceByMaterialId]);

  // materialId -> owned count X (string for typing)
  const [ownedByMaterialId, setOwnedByMaterialId] = useState<Record<number, string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_MATERIAL_OWNED);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_MATERIAL_OWNED, JSON.stringify(ownedByMaterialId));
  }, [ownedByMaterialId]);

  /**
   * Aggregate materials (N)
   * Based on selected slot itemId and slot count.
   */
  const materials = useMemo<MaterialRow[]>(() => {
    const agg = new Map<number, number>();

    function resolveMaterials(itemId: number, multiplier: number, depth: number = 0): MaterialRow[] | undefined {
      const recipe = craftingById.get(itemId);
      if (!recipe || !recipe.materials) return undefined;

      const children: MaterialRow[] = [];
      for (const m of recipe.materials) {
        const unit = toNonNegativeInt(m.count ?? 0);
        if (unit <= 0) continue;

        const totalNeeded = unit * multiplier;
        
        // If it's a top-level call (direct equipment material), aggregate it globally for the columns
        if (depth === 0) {
          const prev = agg.get(m.id) ?? 0;
          agg.set(m.id, prev + totalNeeded);
        }

        const childRow: MaterialRow = {
          id: m.id,
          count: totalNeeded,
          children: resolveMaterials(m.id, totalNeeded, depth + 1),
        };
        children.push(childRow);
      }
      return children.length > 0 ? children : undefined;
    }

    const rootMaterials: MaterialRow[] = [];

    for (const slotState of Object.values(selectedBySlotKey)) {
      if (!slotState) continue;

      const itemId = slotState.itemId ?? null;
      if (!itemId) continue;

      const slotCount = toNonNegativeInt((slotState as any).count);
      if (slotCount <= 0) continue;

      const recipe = craftingById.get(itemId);
      if (!recipe) continue;

      for (const m of recipe.materials ?? []) {
        const unit = toNonNegativeInt(m.count ?? 0);
        if (unit <= 0) continue;

        const totalNeeded = unit * slotCount;
        const prev = agg.get(m.id) ?? 0;
        agg.set(m.id, prev + totalNeeded);

        rootMaterials.push({
          id: m.id,
          count: totalNeeded,
          children: resolveMaterials(m.id, totalNeeded, 1),
        });
      }
    }

    // Return the aggregated rows for the columns.
    // The columns expect a flat list of top-level materials.
    // However, the issue asks for a tree structure.
    // If I change 'materials' to be a tree, MaterialColumn needs to handle it.
    // Currently, MaterialsView splits 'materials' into 3 columns by type.
    
    // We want the columns to still show the top-level materials, but each card can expand to show its sub-materials.
    // So the 'materials' used by MaterialsView should probably still be the top-level ones, but with 'children' populated.
    
    // Let's re-aggregate by material ID at the top level, but keep children.
    const topLevelMap = new Map<number, MaterialRow>();
    for (const slotState of Object.values(selectedBySlotKey)) {
      if (!slotState) continue;
      const itemId = slotState.itemId ?? null;
      if (!itemId) continue;
      const slotCount = toNonNegativeInt((slotState as any).count);
      if (slotCount <= 0) continue;

      const recipe = craftingById.get(itemId);
      if (!recipe) continue;

      for (const m of recipe.materials ?? []) {
        const unit = toNonNegativeInt(m.count ?? 0);
        if (unit <= 0) continue;
        const totalNeeded = unit * slotCount;

        const existing = topLevelMap.get(m.id);
        if (existing) {
          existing.count += totalNeeded;
          // Merge children? That gets complicated.
          // Usually, sub-materials are the same for the same material.
          // Let's just resolve children once or merge them.
          if (!existing.children) {
            existing.children = resolveMaterials(m.id, existing.count, 1);
          } else {
            // Update children counts if we want to be precise, 
            // but resolveMaterials already takes the total multiplier.
            existing.children = resolveMaterials(m.id, existing.count, 1);
          }
        } else {
          topLevelMap.set(m.id, {
            id: m.id,
            count: totalNeeded,
            children: resolveMaterials(m.id, totalNeeded, 1),
          });
        }
      }
    }

    const rows = Array.from(topLevelMap.values());
    rows.sort((a, b) => a.id - b.id);
    return rows;
  }, [selectedBySlotKey, craftingById]);

  const materialsByType = useMemo(() => {
    const groups: Record<MaterialType, MaterialRow[]> = {
      Equipment: [],
      CraftResource: [],
      GatherResource: [],
    };

    for (const row of materials) {
      const item = itemsById.get(row.id);
      const type = normalizeMaterialType(item?.subtype);
      groups[type].push(row);
    }

    for (const rows of Object.values(groups)) rows.sort((a, b) => a.id - b.id);
    return groups;
  }, [materials, itemsById]);

  function getOwnedX(materialId: number): number {
    const raw = ownedByMaterialId[materialId];
    if (raw == null || raw === "") return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function getRemaining(row: MaterialRow): number {
    const x = getOwnedX(row.id);
    return Math.max(0, row.count - x);
  }

  const sumByType = useMemo(() => {
    const sums: Record<MaterialType, number> = {
      Equipment: 0,
      CraftResource: 0,
      GatherResource: 0,
    };

    for (const type of MATERIAL_TYPES) {
      let s = 0;
      for (const row of materialsByType[type]) {
        const remaining = getRemaining(row); // ✅ uses max(0, N - X)
        const price = parseNumber(priceByMaterialId[row.id] ?? "");
        s += remaining * price;
      }
      sums[type] = s;
    }

    return sums;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialsByType, priceByMaterialId, ownedByMaterialId]);

  const totalPrice = useMemo(() => {
    return MATERIAL_TYPES.reduce((acc, type) => acc + sumByType[type], 0);
  }, [sumByType]);

  function updatePrice(id: number, val: string) {
    setPriceByMaterialId((prev) => {
      const next = { ...prev, [id]: val };

      // Try to update parent prices recursively
      // We need a way to find parents.
      // Actually, it's easier to just re-calculate all craftable items' prices 
      // if their materials' prices are all set.
      
      let changed = true;
      while (changed) {
        changed = false;
        for (const [targetId, recipe] of craftingById.entries()) {
          // If this item already has a price set manually, maybe we shouldn't override it?
          // The requirement says "automatically update the cost of the main material".
          // It's safer to only update if it was empty or if it was previously calculated.
          // But the UI doesn't distinguish between manual and automatic.
          
          if (!recipe.materials || recipe.materials.length === 0) continue;

          let allHavePrice = true;
          let totalCost = 0;
          for (const mat of recipe.materials) {
            const p = next[mat.id];
            if (p === undefined || p === "") {
              allHavePrice = false;
              break;
            }
            totalCost += parseNumber(p) * mat.count;
          }

          if (allHavePrice) {
            const newPrice = String(totalCost);
            if (next[targetId] !== newPrice) {
              next[targetId] = newPrice;
              changed = true;
            }
          }
        }
      }

      return next;
    });
  }

  function updateOwned(id: number, val: number) {
    setOwnedByMaterialId((prev) => ({ ...prev, [id]: val === 0 ? "" : String(val) }));
  }

  function decOwned(row: MaterialRow) {
    setOwnedByMaterialId((prev) => {
      const cur = getOwnedX(row.id);
      const nextVal = Math.max(0, cur - 1);
      return { ...prev, [row.id]: nextVal === 0 ? "" : String(nextVal) };
    });
  }

  function incOwned(row: MaterialRow) {
    setOwnedByMaterialId((prev) => {
      const cur = getOwnedX(row.id);
      const nextVal = cur + 1;
      return { ...prev, [row.id]: String(nextVal) };
    });
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {materials.length === 0 ? (
          <div className="text-sm text-default-500"></div>
        ) : (
          <div className="grid h-full min-h-0 min-w-0 grid-cols-[1fr_auto_1fr_auto_1fr] gap-3">
            {MATERIAL_TYPES.map((type, index) => {
              const rows = materialsByType[type];
              const typeName = t(`items/types:subtypes.${type}.name`, type);

              return (
                <Fragment key={type}>
                  <MaterialColumn
                    typeName={typeName}
                    rows={rows}
                    itemsById={itemsById}
                    gradesByName={gradesByName}
                    priceByMaterialId={priceByMaterialId}
                    ownedByMaterialId={ownedByMaterialId}
                    onPriceChange={updatePrice}
                    onOwnedChange={updateOwned}
                    onIncOwned={incOwned}
                    onDecOwned={decOwned}
                    sum={sumByType[type]}
                    sumLabel={t("common:crafting.sumType", "Sum: ")}
                  />

                  {/* ===== Vertical Divider ===== */}
                  {index < MATERIAL_TYPES.length - 1 && (
                    <div className="relative flex items-center justify-center">
                      <div className="absolute top-0 bottom-[calc(50%+24px)] w-px bg-crafting-border" />
                      <div className="absolute top-[calc(50%+24px)] bottom-0 w-px bg-crafting-border" />

                      <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary dark:bg-secondary">
                        <FontAwesomeIcon icon={faPlus} className="text-sm text-white" />
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex w-full items-center">
        <div className="flex-1 h-px bg-crafting-border" />
        <div className="mx-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary dark:bg-secondary">
          <FontAwesomeIcon icon={faEquals} className="text-base text-white" />
        </div>
        <div className="flex-1 h-px bg-crafting-border" />
      </div>

      {/* Total */}
      <div className="mt-2">
        <MaterialSum label={t("common:crafting.sumTotal", "Total: ")} value={totalPrice} />
      </div>
    </div>
  );
}
