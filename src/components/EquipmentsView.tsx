import React, { useEffect, useMemo, useState } from "react";
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
import { getStaticUrl } from "@/utils/url.ts";
import { useTranslation } from "react-i18next";
import { useItemData } from "@/context/ItemDataContext.tsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBan,
  faTableCellsLarge,
} from "@fortawesome/free-solid-svg-icons";
import type { EquipmentSlot } from "@/types/game";
import type { SelectedBySlotKey, SelectedEquipmentState } from "@/types/crafting";

export type EquipmentsViewProps = {
  selectedBySlotKey: SelectedBySlotKey;
  setSelectedBySlotKey: React.Dispatch<React.SetStateAction<SelectedBySlotKey>>;
};


type EquipmentsMode = "thumbnail" | "weapon_armor" | "accessory";

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    if (v && v.trim().length > 0) return v;
  }
  return "";
}

function ensureState(v: SelectedEquipmentState | undefined): SelectedEquipmentState {
  return v ?? { itemId: null, disabled: false };
}

export function EquipmentsView({
                                 selectedBySlotKey,
                                 setSelectedBySlotKey,
                               }: EquipmentsViewProps) {
  const [open, setOpen] = useState(false);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>("");
  const [mode, setMode] = useState<EquipmentsMode>("thumbnail");

  const { craftingItemIdsByType, slots, items, gradesByName } = useItemData();
  const { t } = useTranslation();

  const activeSlot = useMemo(() => {
    if (!activeSlotKey) return null;
    return slots.find((s) => s.key === activeSlotKey) ?? null;
  }, [activeSlotKey, slots]);

  const allowedTypes = useMemo(() => {
    return activeSlot?.allowed_types ?? [];
  }, [activeSlot]);

  // Keep activeType valid when slot changes / modal opens
  useEffect(() => {
    if (!open) return;
    const first = allowedTypes[0] ?? "";
    if (!activeType || (first && !allowedTypes.includes(activeType))) {
      setActiveType(first);
    }
  }, [open, allowedTypes, activeType]);

  const craftingIdsForActiveType = useMemo(() => {
    if (!activeType) return [];
    return craftingItemIdsByType.get(activeType) ?? [];
  }, [activeType, craftingItemIdsByType]);

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
      return { ...prev, [slotKey]: { ...cur, itemId } };
    });
    setOpen(false);
  }

  function clearSlot(slotKey: string) {
    setSelectedBySlotKey((prev) => {
      const cur = ensureState(prev[slotKey]);
      return { ...prev, [slotKey]: { ...cur, itemId: null } };
    });
    setOpen(false);
  }

  function toggleDisabled(slotKey: string) {
    setSelectedBySlotKey((prev) => {
      const cur = ensureState(prev[slotKey]);
      return { ...prev, [slotKey]: { ...cur, disabled: !cur.disabled } };
    });
  }

  function disableAllSlots() {
    setSelectedBySlotKey((prev) => {
      const next: Record<string, SelectedEquipmentState> = { ...(prev as any) };
      for (const slot of slots) {
        const cur = ensureState(prev[slot.key]);
        next[slot.key] = { ...cur, disabled: true };
      }
      return next;
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

  const gridClassName = mode === "thumbnail" ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2";

  return (
    <div className="flex h-full w-full flex-col">
      {/* Title */}
      <div className="my-3 h-[38px] text-center text-[22px] font-bold text-default-900">
        {t("common:crafting.selectClick", "Click to select equipment")}
      </div>

      {/* Main content */}
      <div className="flex-1">
        <div className="flex w-full justify-center">
          <div className={gridClassName}>
            {displaySlots.map((slot) => {
              const slotState = ensureState(selectedBySlotKey[slot.key]);
              const selectedId = slotState.itemId;
              const isDisabled = slotState.disabled;

              const selectedItem = selectedId ? items.find((it) => it.id === selectedId) : undefined;

              const imgSrc = getStaticUrl(firstNonEmpty(selectedItem?.icon, slot.icon));
              const localizedSlotName = t(`items/types:subtypes.${slot.name}.name`, slot.name);

              const grade = gradesByName.get(selectedItem?.grade || "");
              const gradeName = grade?.name || "";

              const displayName = selectedItem
                ? t(`items/items:${selectedItem.id}.name`, String(selectedItem.id))
                : localizedSlotName;

              const onSlotClick = () => {
                if (isDisabled) {
                  // Clicking anywhere activates (enables) it
                  toggleDisabled(slot.key);
                  return;
                }
                if (slot.craftable) openSlot(slot.key);
              };

              if (mode === "thumbnail") {
                const gradeBackground = getStaticUrl(
                  `UI/Resource/Texture/ETC/UT_SlotGrade_${gradeName}.webp`,
                );

                return (
                  <button
                    key={slot.key}
                    type="button"
                    onClick={onSlotClick}
                    className={[
                      "relative h-12 w-[89px] rounded-sm bg-contain bg-center bg-no-repeat",
                      isDisabled ? "cursor-pointer" : "",
                    ].join(" ")}
                    style={{
                      backgroundImage: `url(${gradeBackground})`,
                      backgroundSize: "100% 100%",
                    }}
                    title={displayName}
                  >
                    <div
                      className={`flex h-full w-full items-center justify-center rounded-sm ${
                        selectedId ? "" : "bg-[#0D0E15]"
                      }`}
                    >
                      <img src={imgSrc} alt={slot.name} className="h-full w-full object-contain" />
                    </div>

                    {/* Disabled mask + centered icon */}
                    {isDisabled && (
                      <div
                        className="absolute inset-0 z-10 flex items-center justify-center rounded-sm"
                        style={{
                          background: "rgba(0,0,0,0.6)",
                          boxShadow: "inset 0px 0px 6px 5px rgba(255,255,255,0.7)",
                        }}
                      >
                        <FontAwesomeIcon icon={faBan} className="text-[22px] text-white" />
                      </div>
                    )}

                    {/* Slot name */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-1 z-20">
                      <div className="mx-auto w-fit rounded text-[14px] font-bold leading-tight text-white">
                        {localizedSlotName}
                      </div>
                    </div>

                    {/* Bottom-right disable toggle (only when NOT disabled) */}
                    {!isDisabled && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleDisabled(slot.key);
                        }}
                        className="absolute bottom-1 right-1 z-30 flex h-5 w-5 items-center justify-center rounded-sm bg-black/40 hover:bg-black/60"
                        title={t("common:crafting.disableSlot", "Disable slot")}
                      >
                        <FontAwesomeIcon icon={faBan} className="text-[12px] text-white" />
                      </button>
                    )}
                  </button>
                );
              }

              const gradeBackground = getStaticUrl(
                `UI/Resource/Texture/ETC/UT_ItemTooltipGrade_${gradeName}.webp`,
              );

              return (
                <button
                  key={slot.key}
                  type="button"
                  onClick={onSlotClick}
                  className="relative h-12 w-[188px] rounded-sm bg-contain bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${gradeBackground})`,
                    backgroundSize: "100% 100%",
                  }}
                  title={displayName}
                >
                  <div
                    className={`flex h-full w-full items-center rounded-sm px-2 ${
                      selectedId ? "" : "bg-[#0D0E15]"
                    }`}
                  >
                    <img src={imgSrc} alt={slot.name} className="h-12 w-12 shrink-0 object-contain" />
                    <div className="ml-2 min-w-0 flex-1 truncate text-left text-sm font-bold text-white">
                      {displayName}
                    </div>
                  </div>

                  {/* Disabled mask + centered icon */}
                  {isDisabled && (
                    <div
                      className="absolute inset-0 z-10 flex items-center justify-center rounded-sm"
                      style={{
                        background: "rgba(0,0,0,0.6)",
                        boxShadow: "inset 0px 0px 6px 5px rgba(255,255,255,0.7)",
                      }}
                    >
                      <FontAwesomeIcon icon={faBan} className="text-[22px] text-white" />
                    </div>
                  )}

                  {/* Bottom-right disable toggle (only when NOT disabled) */}
                  {!isDisabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleDisabled(slot.key);
                      }}
                      className="absolute bottom-1 right-1 z-30 flex h-5 w-5 items-center justify-center rounded-sm bg-black/40 hover:bg-black/60"
                      title={t("common:crafting.disableSlot", "Disable slot")}
                    >
                      <FontAwesomeIcon icon={faBan} className="text-[12px] text-white" />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Disable all button (above bottom tabs) */}
      <div className="mt-2 w-full">
        <Button
          size="sm"
          variant="flat"
          onPress={disableAllSlots}
          className="h-[34px] w-full rounded-sm border-1 border-crafting-border bg-crafting-sum"
        >
        <span className="flex w-full items-center justify-center gap-2 text-[14px] text-default-800">
          <FontAwesomeIcon icon={faBan} />
          {t("common:crafting.disableAll", "Disable all slots")}
        </span>
        </Button>
      </div>

      {/* Bottom mode switcher */}
      <div className="mt-2">
        <Tabs
          selectedKey={mode}
          onSelectionChange={(k) => setMode(k as EquipmentsMode)}
          variant="light"
          color="primary"
          className="w-full rounded-sm border-1 border-crafting-border bg-crafting-sum"
          classNames={{
            tabList: "w-full flex gap-0",
            tab: "h-[30px] flex-1 justify-center",
            tabContent:
              "flex items-center justify-center text-default-800 group-data-[selected=true]:text-background",
          }}
        >
          <Tab key="thumbnail" title={<FontAwesomeIcon icon={faTableCellsLarge} />} />
          <Tab key="weapon_armor" title={t("common:crafting.weaponOrArmor", "Weapon / Armor")} />
          <Tab key="accessory" title={t("common:crafting.accessory", "Accessory")} />
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
                      <Tab key={ty} title={t(`items/types:subtypes.${ty}.name`, ty)} />
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

                              <div className="flex h-16 w-[160px] items-center px-2 text-left text-[14px] font-bold text-white [text-shadow:0px_2px_4px_rgba(0,0,0,0.3)]">
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
