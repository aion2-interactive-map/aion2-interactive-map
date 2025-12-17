import {Fragment, useEffect, useMemo, useState} from "react";
import {NumberInput} from "@heroui/react";
import {useTranslation} from "react-i18next";
import {useItemData} from "@/context/ItemDataContext";
import {getStaticUrl} from "@/utils/url";
import {faDatabase, faEquals, faPlus} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import type {SelectedBySlotKey} from "@/types/crafting";


export type MaterialsViewProps = {
  selectedBySlotKey: SelectedBySlotKey;
};

type MaterialRow = {
  id: number;
  count: number;
};

function parseNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const STORAGE_MATERIAL_PRICES = "aion2.crafting.prices.v1";

const MATERIAL_TYPES = ["Equipment", "CraftResource", "GatherResource"] as const;
type MaterialType = (typeof MATERIAL_TYPES)[number];

function normalizeMaterialType(subtype: string | null | undefined): MaterialType {
  if (subtype === "CraftResource") return "CraftResource";
  if (subtype === "GatherResource") return "GatherResource";
  return "Equipment";
}

export function MaterialsView({selectedBySlotKey}: MaterialsViewProps) {
  const {craftingById, itemsById, gradesByName} = useItemData();
  const {t} = useTranslation();

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

  /**
   * ✅ Aggregate materials
   * ❗ Only from ENABLED slots
   */
  const materials = useMemo<MaterialRow[]>(() => {
    const agg = new Map<number, number>();

    for (const slotState of Object.values(selectedBySlotKey)) {
      if (!slotState) continue;
      if (slotState.disabled) continue;

      const itemId = slotState.itemId;
      if (!itemId) continue;

      const recipe = craftingById.get(itemId);
      if (!recipe) continue;

      for (const m of recipe.materials ?? []) {
        const prev = agg.get(m.id) ?? 0;
        agg.set(m.id, prev + (m.count ?? 0));
      }
    }

    const rows = Array.from(agg.entries()).map(([id, count]) => ({id, count}));
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

    for (const rows of Object.values(groups)) {
      rows.sort((a, b) => a.id - b.id);
    }

    return groups;
  }, [materials, itemsById]);

  const sumByType = useMemo(() => {
    const sums: Record<MaterialType, number> = {
      Equipment: 0,
      CraftResource: 0,
      GatherResource: 0,
    };

    for (const type of MATERIAL_TYPES) {
      let s = 0;
      for (const row of materialsByType[type]) {
        const price = parseNumber(priceByMaterialId[row.id] ?? "");
        s += row.count * price;
      }
      sums[type] = s;
    }

    return sums;
  }, [materialsByType, priceByMaterialId]);

  const totalPrice = useMemo(() => {
    return MATERIAL_TYPES.reduce((acc, type) => acc + sumByType[type], 0);
  }, [sumByType]);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {materials.length === 0 ? (
          <div className="text-sm text-default-500">

          </div>
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
                    <div
                      className="m-2 flex h-[38px] items-center justify-center border-b border-crafting-border px-3 py-2">
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

                            return (
                              <div
                                key={row.id}
                                className="flex flex-col gap-2 rounded-lg border border-default-200 bg-crafting-item p-2"
                              >
                                <div className="truncate text-sm font-semibold text-default-900">
                                  {name}
                                </div>

                                <div className="flex items-center gap-3">
                                  <div
                                    className="flex h-12 w-12 items-center justify-center rounded-sm bg-contain bg-center bg-no-repeat"
                                    style={{backgroundImage: `url(${gradeBackground})`}}
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

                                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                                    <div className="text-sm font-semibold text-default-900">
                                      × {row.count}
                                    </div>

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
                                        inputWrapper: ` bg-search-item hover:!bg-search-item focus:!bg-search-item transition-none
                                                        group-data-[hover=true]:!bg-search-item
                                                        group-data-[focus=true]:!bg-search-item
                                                        group-data-[focus-visible=true]:!bg-search-item
                                                        group-data-[invalid=true]:!bg-search-item
                                                        h-[28px] min-h-[28px] px-2
                                                        border-1 border-crafting-border
                                                        shadow-none focus-within:shadow-none
                                                      `,
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
                    <div className="relative m-2 h-[38px] rounded-lg border border-primary bg-crafting-sum">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-[16px] font-bold text-primary">
                          <FontAwesomeIcon icon={faDatabase} className="text-sm"/>
                          {t("common:crafting.sumType", "Sum: ")}
                          {sumByType[type].toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ===== Vertical Divider (skip after last column) ===== */}
                  {index < MATERIAL_TYPES.length - 1 && (
                    <div className="relative flex items-center justify-center">
                      {/* Top line */}
                      <div className="absolute top-0 bottom-[calc(50%+24px)] w-px bg-crafting-border"/>
                      {/* Bottom line */}
                      <div className="absolute top-[calc(50%+24px)] bottom-0 w-px bg-crafting-border"/>

                      {/* Icon */}
                      <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <FontAwesomeIcon icon={faPlus} className="text-[14px] text-white"/>
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
        <div className="flex-1 h-px bg-crafting-border"/>
        <div className="mx-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
          <FontAwesomeIcon icon={faEquals} className="text-[16px] text-white"/>
        </div>
        <div className="flex-1 h-px bg-crafting-border"/>
      </div>

      {/* Total */}
      <div className="relative mt-2 h-[38px] rounded-lg border border-primary bg-crafting-sum">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-[16px] font-bold text-primary">
            <FontAwesomeIcon icon={faDatabase} className="text-sm"/>
            {t("common:crafting.sumTotal", "Total: ")}
            {totalPrice.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
