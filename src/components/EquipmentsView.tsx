import React, {useEffect, useMemo, useState} from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
} from "@heroui/react";
import {getStaticUrl} from "@/utils/url.ts";
import {useTranslation} from "react-i18next";
import {useItemData} from "@/context/ItemDataContext.tsx";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faMinus,
  faPlus,
  faTableCellsLarge,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import type {EquipmentSlot} from "@/types/game";
import type {SelectedBySlotKey, SelectedEquipmentState} from "@/types/crafting";

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

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    if (v && v.trim().length > 0) return v;
  }
  return "";
}

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
      <div className="my-3 h-[38px] text-center text-[22px] font-bold text-default-900">
        {t("common:crafting.selectClick", "Click to select equipment")}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex w-full justify-center ">
          <div className={gridClassName}>
            {displaySlots.map((slot) => {
              const slotState = ensureState(selectedBySlotKey[slot.key]);
              const selectedId = slotState.itemId;
              const count = slotState.count;

              const selectedItem = selectedId ? items.find((it) => it.id === selectedId) : undefined;

              const imgSrc = getStaticUrl(firstNonEmpty(selectedItem?.icon, slot.icon));

              const slotName = t(`items/types:subtypes.${slot.name}.name`, slot.name);
              const itemName = selectedItem
                ? t(`items/items:${selectedItem.id}.name`, String(selectedItem.id))
                : slotName;

              const grade = gradesByName.get(selectedItem?.grade || "");
              const gradeName = grade?.name || "";

              const onSlotClick = () => {
                if (slot.craftable) openSlot(slot.key);
              };

              const CountBar = (
                <div className="pointer-events-none flex items-center justify-center">
                  <div className="pointer-events-auto flex items-center gap-2 rounded-sm bg-black/40 px-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        bumpCount(slot.key, -1);
                      }}
                      disabled={!selectedId || count <= 0}
                      className={[
                        "flex h-[16px] w-[16px] items-center justify-center rounded-sm",
                        !selectedId || count <= 0 ? "opacity-40" : "hover:bg-black/30",
                      ].join(" ")}
                      title={t("common:crafting.minus", "Minus")}
                    >
                      <FontAwesomeIcon icon={faMinus} className="text-[10px] text-white"/>
                    </button>

                    <div className="min-w-[18px] text-center text-[12px] font-bold leading-[12px] text-white">
                      {selectedId ? String(Math.max(0, count)) : "0"}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        bumpCount(slot.key, +1);
                      }}
                      disabled={!selectedId}
                      className={[
                        "flex h-[16px] w-[16px] items-center justify-center rounded-sm",
                        !selectedId ? "opacity-40" : "hover:bg-black/30",
                      ].join(" ")}
                      title={t("common:crafting.plus", "Plus")}
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-[10px] text-white"/>
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
                    key={slot.key}
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
                      <img src={imgSrc} alt={slot.name} className="h-full w-full object-contain"/>
                    </div>

                    {/* Top: slot name */}
                    <div className="pointer-events-none absolute inset-x-1 top-[2px] z-20">
                      <div
                        className="truncate text-center text-[12px] font-bold leading-[12px] text-white [text-shadow:0px_2px_4px_rgba(0,0,0,0.35)]">
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
                  key={slot.key}
                  type="button"
                  onClick={onSlotClick}
                  className="relative h-[56px] w-[188px] rounded-sm bg-contain bg-center bg-no-repeat"
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
                    <img
                      src={imgSrc}
                      alt={slot.name}
                      className="h-12 w-12 shrink-0 object-contain"
                    />

                    {/* Right: item name (top) + count (bottom) */}
                    <div className="ml-2 flex h-[48px] min-w-0 flex-1 flex-col justify-center">
                      <div
                        className="truncate text-left text-[13px] font-bold leading-[13px] text-white [text-shadow:0px_2px_4px_rgba(0,0,0,0.35)]">
                        {itemName}
                      </div>
                      {selectedItem && (
                        <div className="mt-1 flex items-center">
                          {CountBar}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
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
          <span className="flex w-full items-center justify-center gap-2 text-[14px] text-default-800">
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
      <Modal isOpen={open} onOpenChange={(v) => setOpen(v)} size="5xl">
        <ModalContent className="w-fit max-w-none">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-2">
                <div>{t("common:crafting.select", "Select item")}</div>

                {activeSlot && allowedTypes.length > 0 ? (
                  <Tabs
                    selectedKey={activeType}
                    onSelectionChange={(k) => setActiveType(String(k))}
                    variant="underlined"
                    classNames={{
                      tabList: "gap-2",
                      cursor: "bg-default-800",
                      tab: "h-8",
                    }}
                  >
                    {allowedTypes.map((ty) => (
                      <Tab key={ty} title={t(`items/types:subtypes.${ty}.name`, ty)}/>
                    ))}
                  </Tabs>
                ) : null}
              </ModalHeader>

              <ModalBody>
                {!activeSlot ? (
                  <div className="text-sm text-default-500">No slot selected.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="max-h-[560px] overflow-y-auto">
                      <div className="grid grid-cols-3 gap-5">
                        {filteredItems.map((it) => {
                          const localizedName = t(`items/items:${it.id}.name`, it.subtype);
                          const grade = gradesByName.get(it.grade);
                          const gradeBackground = getStaticUrl(
                            `UI/Resource/Texture/ETC/UT_ItemTooltipGrade_${grade?.name}.webp`,
                          );

                          return (
                            <button
                              key={it.id}
                              type="button"
                              onClick={() => selectItem(activeSlot.key, it.id)}
                              className="flex items-center rounded-sm border-2 border-default bg-contain bg-center bg-no-repeat"
                              style={{
                                backgroundImage: `url(${gradeBackground})`,
                                backgroundSize: "100% 100%",
                              }}
                              title={`${it.id} (${it.subtype})`}
                            >
                              <img
                                src={getStaticUrl(it.icon)}
                                alt={String(it.id)}
                                className="h-16 w-16 object-contain"
                              />

                              <div
                                className="flex h-16 w-[160px] items-center px-2 text-left text-[14px] font-bold text-white [text-shadow:0px_2px_4px_rgba(0,0,0,0.3)]">
                                {localizedName}
                              </div>
                            </button>
                          );
                        })}

                        {filteredItems.length === 0 && (
                          <div className="col-span-3 text-sm text-default-500">
                            No craftable items match this slot’s allowed types.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>

              <ModalFooter>
                {activeSlot ? (
                  <Button variant="flat" color="danger" onPress={() => clearSlot(activeSlot.key)}>
                    {t("common:ui.clear")}
                  </Button>
                ) : null}
                <Button variant="flat" onPress={onClose}>
                  {t("common:ui.close")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
