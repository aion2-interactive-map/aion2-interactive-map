import React, {useEffect, useMemo, useState} from "react";
import {
  Button,
  Tab,
  Tabs,
} from "@heroui/react";
import {useTranslation} from "react-i18next";
import {useItemData} from "@/context/ItemDataContext.tsx";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faTableCellsLarge,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import type {EquipmentSlot} from "@/types/game.ts";
import type {SelectedBySlotKey, SelectedEquipmentState} from "@/types/crafting.ts";
import {EquipmentSlotCard} from "@/components/Crafting/EquipmentSlotCard.tsx";
import {EquipmentSelectionModal} from "@/components/Crafting/EquipmentSelectionModal.tsx";

export type EquipmentsViewProps = {
  selectedBySlotKey: SelectedBySlotKey;
  setSelectedBySlotKey: React.Dispatch<React.SetStateAction<SelectedBySlotKey>>;

  /**
   * Optional: filters modal craftables by crafting recipe race
   * - recipe.race === race => allowed
   * - recipe.race null/undefined => allowed
   */
  race?: "light" | "dark";
};

type EquipmentsMode = "thumbnail" | "weapon_armor" | "accessory";


function ensureState(v: SelectedEquipmentState | undefined): SelectedEquipmentState {
  const itemId = (v as any)?.itemId;
  const count = (v as any)?.count;
  return {
    itemId: typeof itemId === "number" || itemId === null ? itemId : null,
    count: typeof count === "number" && Number.isFinite(count) ? count : 0,
  } as SelectedEquipmentState;
}

function clampCount(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 99) return 99;
  return Math.floor(n);
}

function isAllowedByRace(
  recipeRace: "light" | "dark" | null | undefined,
  selectedRace: "light" | "dark" | undefined,
): boolean {
  if (!selectedRace) return true;
  if (recipeRace == null) return true;
  return recipeRace === selectedRace;
}

export function EquipmentsView({
                                 selectedBySlotKey,
                                 setSelectedBySlotKey,
                                 race,
                               }: EquipmentsViewProps) {
  const [open, setOpen] = useState(false);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>("");
  const [mode, setMode] = useState<EquipmentsMode>("thumbnail");

  const {craftingItemIdsByType, craftingById, slots, items, gradesByName} = useItemData();
  const {t} = useTranslation();

  const activeSlot = useMemo(() => {
    if (!activeSlotKey) return null;
    return slots.find((s) => s.key === activeSlotKey) ?? null;
  }, [activeSlotKey, slots]);

  const allowedTypes = useMemo(() => {
    return activeSlot?.allowed_types ?? [];
  }, [activeSlot]);

  useEffect(() => {
    if (!open) return;
    const first = allowedTypes[0] ?? "";
    if (!activeType || (first && !allowedTypes.includes(activeType))) {
      setActiveType(first);
    }
  }, [open, allowedTypes, activeType]);

  const craftingIdsForActiveType = useMemo(() => {
    if (!activeType) return [];
    const ids = craftingItemIdsByType.get(activeType) ?? [];
    return ids.filter((id) => {
      const recipe = craftingById.get(id);
      return isAllowedByRace(recipe?.race ?? null, race);
    });
  }, [activeType, craftingItemIdsByType, craftingById, race]);

  const filteredItems = useMemo(() => {
    if (!activeSlot || !activeType) return [];
    const craftableSet = new Set<number>(craftingIdsForActiveType);
    return items.filter((it) => it.subtype === activeType && craftableSet.has(it.id));
  }, [activeSlot, activeType, items, craftingIdsForActiveType]);

  function openSlot(slotKey: string) {
    setActiveSlotKey(slotKey);
    setOpen(true);
  }

  function selectItem(slotKey: string, itemId: number) {
    setSelectedBySlotKey((prev) => {
      const cur = ensureState(prev[slotKey]);
      const nextCount = cur.count > 0 ? cur.count : 1;
      return {...prev, [slotKey]: {...cur, itemId, count: nextCount}};
    });
    setOpen(false);
  }

  function clearSlot(slotKey: string) {
    setSelectedBySlotKey((prev) => {
      const cur = ensureState(prev[slotKey]);
      return {...prev, [slotKey]: {...cur, itemId: null, count: 0}};
    });
    setOpen(false);
  }

  function clearAllSlots() {
    setSelectedBySlotKey((prev) => {
      const next: Record<string, SelectedEquipmentState> = {};
      for (const slot of slots) {
        const cur = ensureState(prev[slot.key]);
        next[slot.key] = {...cur, itemId: null, count: 0};
      }
      return next as SelectedBySlotKey;
    });
  }

  function bumpCount(slotKey: string, delta: number) {
    setSelectedBySlotKey((prev) => {
      const cur = ensureState(prev[slotKey]);
      if (!cur.itemId) return prev; // no item => no count
      const nextCount = clampCount(cur.count + delta);
      return {...prev, [slotKey]: {...cur, count: nextCount}};
    });
  }

  let displaySlots: EquipmentSlot[] = [];
  if (mode === "thumbnail") {
    displaySlots = slots;
  } else if (mode === "weapon_armor") {
    displaySlots = slots.slice(0, 10);
  } else {
    displaySlots = slots.slice(10, 20);
  }

  const gridClassName =
    mode === "thumbnail" ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2";

  return (
    <div className="flex h-full w-full flex-col">
      {/* Title */}
      <div className="my-3 h-[38px] text-center text-xl font-bold text-default-900">
        {t("common:crafting.selectClick", "Click to select equipment")}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex w-full justify-center ">
          <div className={gridClassName}>
            {displaySlots.map((slot) => {
              const slotState = ensureState(selectedBySlotKey[slot.key]);
              const selectedItem = slotState.itemId ? items.find((it) => it.id === slotState.itemId) : undefined;
              const grade = gradesByName.get(selectedItem?.grade || "");

              return (
                <EquipmentSlotCard
                  key={slot.key}
                  slot={slot}
                  selectedItem={selectedItem}
                  count={slotState.count}
                  mode={mode}
                  gradeName={grade?.name || ""}
                  onSlotClick={() => slot.craftable && openSlot(slot.key)}
                  onBumpCount={(delta) => bumpCount(slot.key, delta)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Clear all */}
      <div className="mt-2 w-full">
        <Button
          size="sm"
          variant="flat"
          onPress={clearAllSlots}
          className="h-[34px] w-full rounded-sm border-1 border-crafting-border bg-crafting-sum"
        >
          <span className="flex w-full items-center justify-center gap-2 text-sm text-default-800">
            <FontAwesomeIcon icon={faTrash}/>
            {t("common:crafting.clearAll", "Clear all slots")}
          </span>
        </Button>
      </div>

      {/* Bottom mode switcher */}
      <div className="mt-2">
        <Tabs
          selectedKey={mode}
          onSelectionChange={(k) => setMode(k as EquipmentsMode)}
          variant="light"
          className="w-full rounded-sm border-1 border-crafting-border bg-crafting-sum"
          classNames={{
            tabList: "w-full flex gap-0",
            tab: "h-[30px] flex-1 justify-center " +
              "data-[selected=true]:bg-primary " +
              "dark:data-[selected=true]:bg-default-800",
            tabContent:
              "flex items-center justify-center text-default-800 group-data-[selected=true]:text-background",
          }}
        >
          <Tab key="thumbnail" title={<FontAwesomeIcon icon={faTableCellsLarge}/>}/>
          <Tab key="weapon_armor" title={t("common:crafting.weaponOrArmor", "Weapon / Armor")}/>
          <Tab key="accessory" title={t("common:crafting.accessory", "Accessory")}/>
        </Tabs>
      </div>

      {/* Modal */}
      <EquipmentSelectionModal
        isOpen={open}
        onOpenChange={(v) => setOpen(v)}
        activeSlot={activeSlot}
        activeType={activeType}
        setActiveType={setActiveType}
        allowedTypes={allowedTypes}
        filteredItems={filteredItems}
        gradesByName={gradesByName}
        onSelectItem={selectItem}
        onClearSlot={clearSlot}
      />
    </div>
  );
}
