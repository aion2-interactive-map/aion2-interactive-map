import { Fragment, useEffect, useMemo, useState } from "react";
import { NumberInput } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useItemData } from "@/context/ItemDataContext";
import { getStaticUrl } from "@/utils/url";
import { faDatabase, faEquals, faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { SelectedBySlotKey } from "@/types/crafting";

export type MaterialsViewProps = {
  selectedBySlotKey: SelectedBySlotKey;
};

type MaterialRow = {
  id: number;
  count: number; // N
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

        const prev = agg.get(m.id) ?? 0;
        agg.set(m.id, prev + unit * slotCount);
      }
    }

    const rows = Array.from(agg.entries()).map(([id, count]) => ({ id, count }));
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

  function decOwned(row: MaterialRow) {
    setOwnedByMaterialId((prev) => {
      const cur = getOwnedX(row.id);
      const nextVal = Math.max(0, cur - 1);
      return { ...prev, [row.id]: String(nextVal) };
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
                  {/* ===== Column ===== */}
                  <div className="flex h-full min-h-0 flex-col rounded-lg border border-crafting-border bg-transparent">
                    {/* Header */}
                    <div className="m-2 flex h-[38px] items-center justify-center border-b border-crafting-border px-3 py-2">
                      <div className="text-[16px] font-bold leading-[16px] text-default-900">
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
                            const gradeBackground = getStaticUrl(
                              `UI/Resource/Texture/ETC/UT_SlotGrade_${grade?.name}.webp`,
                            );

                            const x = getOwnedX(row.id);

                            return (
                              <div
                                key={row.id}
                                className="flex flex-col gap-2 rounded-lg border border-default-200 bg-crafting-item p-2"
                              >
                                <div className="truncate text-sm font-semibold text-default-900">
                                  {name}
                                </div>

                                <div className="flex items-center gap-3">
                                  {/* Icon */}
                                  <div
                                    className="flex h-12 w-12 items-center justify-center rounded-sm bg-contain bg-center bg-no-repeat"
                                    style={{ backgroundImage: `url(${gradeBackground})` }}
                                  >
                                    {icon ? (
                                      <img
                                        src={icon}
                                        alt={name}
                                        className="h-12 w-12 object-contain"
                                      />
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
                                        onClick={() => decOwned(row)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" || e.key === " ") decOwned(row);
                                        }}
                                        title="-"
                                      >
                                        <FontAwesomeIcon icon={faMinus} className="text-[10px] text-white" />
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span
                                          className="inline-flex align-middle -translate-y-[1px]"
                                          style={{ width: `${Math.max(3, String(x).length)}ch` }}
                                        >
                                          <NumberInput
                                            size="sm"
                                            hideStepper
                                            value={x}
                                            onValueChange={(v) => {
                                              const nextX = toNonNegativeInt(v ?? 0);
                                              setOwnedByMaterialId((prev) => ({
                                                ...prev,
                                                [row.id]: nextX === 0 ? "" : String(nextX),
                                              }));
                                            }}
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
                                        onClick={() => incOwned(row)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" || e.key === " ") incOwned(row);
                                        }}
                                        title="+"
                                      >
                                        <FontAwesomeIcon icon={faPlus} className="text-[10px] text-white" />
                                      </div>
                                    </div>

                                    {/* Unit price (cost uses remaining = max(0, N - X)) */}
                                    <NumberInput
                                      size="sm"
                                      hideStepper
                                      placeholder="输入价格"
                                      value={unitPriceStr ? Number(unitPriceStr) : undefined}
                                      onValueChange={(v) =>
                                        setPriceByMaterialId((prev) => ({
                                          ...prev,
                                          [row.id]: v == null ? "" : String(v),
                                        }))
                                      }
                                      radius="sm"
                                      classNames={{
                                        base: "h-[28px]",
                                        inputWrapper:
                                          "bg-search-item hover:!bg-search-item transition-none " +
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
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Column sum */}
                    <div className="relative m-2 h-[38px] rounded-lg border border-primary dark:border-crafting-border bg-crafting-sum">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-[16px] font-bold text-primary dark:text-default-800">
                          <FontAwesomeIcon icon={faDatabase} className="text-sm" />
                          {t("common:crafting.sumType", "Sum: ")}
                          {sumByType[type].toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ===== Vertical Divider ===== */}
                  {index < MATERIAL_TYPES.length - 1 && (
                    <div className="relative flex items-center justify-center">
                      <div className="absolute top-0 bottom-[calc(50%+24px)] w-px bg-crafting-border" />
                      <div className="absolute top-[calc(50%+24px)] bottom-0 w-px bg-crafting-border" />

                      <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary dark:bg-secondary">
                        <FontAwesomeIcon icon={faPlus} className="text-[14px] text-white" />
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
          <FontAwesomeIcon icon={faEquals} className="text-[16px] text-white" />
        </div>
        <div className="flex-1 h-px bg-crafting-border" />
      </div>

      {/* Total */}
      <div className="relative mt-2 h-[38px] rounded-lg border border-primary dark:border-crafting-border bg-crafting-sum">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-[16px] font-bold text-primary dark:text-default-800">
            <FontAwesomeIcon icon={faDatabase} className="text-sm" />
            {t("common:crafting.sumTotal", "Total: ")}
            {totalPrice.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
