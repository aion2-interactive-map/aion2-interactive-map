import React from "react";
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
import { useTranslation } from "react-i18next";
import { getStaticUrl } from "@/utils/url.ts";
import type { EquipmentSlot, GradeMeta as Grade, ItemMeta as Item } from "@/types/game.ts";

export type EquipmentSelectionModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeSlot: EquipmentSlot | null;
  activeType: string;
  setActiveType: (type: string) => void;
  allowedTypes: string[];
  filteredItems: Item[];
  gradesByName: Map<string, Grade>;
  onSelectItem: (slotKey: string, itemId: number) => void;
  onClearSlot: (slotKey: string) => void;
};

export const EquipmentSelectionModal: React.FC<EquipmentSelectionModalProps> = ({
  isOpen,
  onOpenChange,
  activeSlot,
  activeType,
  setActiveType,
  allowedTypes,
  filteredItems,
  gradesByName,
  onSelectItem,
  onClearSlot,
}) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl">
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
                            onClick={() => onSelectItem(activeSlot.key, it.id)}
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
                <Button variant="flat" color="danger" onPress={() => onClearSlot(activeSlot.key)}>
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
  );
};
